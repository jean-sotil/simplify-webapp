import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db.server'

export const maxDuration = 300

/**
 * POST /api/analyze-sustento
 *
 * Analyzes unfound requirements against sustento documents using LLM.
 * For each requirement, searches sustento docs for evidence of compliance.
 * Results are saved as sustento_links in the DB.
 *
 * Body: { projectId, analysisId, requirements: [{requirementId, text}], documentIds: string[] }
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { projectId, analysisId, requirements, documentIds } = body as {
    projectId: string
    analysisId: string
    requirements: Array<{ requirementId: string; text: string }>
    documentIds: string[]
  }

  if (!projectId || !requirements?.length || !documentIds?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  console.log(`[analyze-sustento] Project: ${projectId}, Reqs: ${requirements.length}, Sustento docs: ${documentIds.length}`)

  // Get sustento document content
  const { data: docs } = await supabaseAdmin
    .from('documents')
    .select('id, filename, original_file_url, extracted_text')
    .in('id', documentIds)

  if (!docs || docs.length === 0) {
    return NextResponse.json({ error: 'No sustento documents found' }, { status: 400 })
  }

  // Extract text from sustento docs (use extracted_text if available, otherwise fetch PDF)
  const docTexts: Array<{ id: string; filename: string; text: string }> = []
  for (const doc of docs) {
    if (doc.extracted_text) {
      docTexts.push({ id: doc.id, filename: doc.filename, text: doc.extracted_text })
    } else if (doc.original_file_url) {
      try {
        const headers: Record<string, string> = {}
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
        }
        const res = await fetch(doc.original_file_url, { headers })
        if (res.ok) {
          const buffer = await res.arrayBuffer()
          const { extractText } = await import('unpdf')
          const result = await extractText(new Uint8Array(buffer), { mergePages: false })
          docTexts.push({ id: doc.id, filename: doc.filename, text: result.text.join('\n') })
        }
      } catch (err) {
        console.error(`[analyze-sustento] Failed to extract text from ${doc.filename}:`, err)
      }
    }
  }

  if (docTexts.length === 0) {
    return NextResponse.json({ error: 'Could not extract text from sustento documents' }, { status: 400 })
  }

  console.log(`[analyze-sustento] Extracted text from ${docTexts.length} docs`)

  // Combine all sustento text for LLM analysis
  const sustentoContent = docTexts.map(d => `--- DOCUMENT: ${d.filename} ---\n${d.text}`).join('\n\n')

  // Build requirement list
  const reqList = requirements.map(r => `${r.requirementId}: ${r.text}`).join('\n')

  // Call LLM to find which requirements are covered by sustento docs
  const systemPrompt = `You are a compliance analyst. You need to determine which technical requirements are addressed or supported by the provided support letters (cartas de sustento).

RULES:
- A support letter may confirm compliance through manufacturer statements, certifications, or technical guarantees
- Look for explicit mentions of capabilities, specifications, or compliance statements
- The support letter may use different terminology but confirm the same capability
- Only mark a requirement as found if there is CLEAR evidence in the support letter
- Include the exact text from the support letter that proves compliance
- Include the document filename where evidence was found

Respond in JSON ONLY:
{"results":[{"requirementId":"REQ-001","found":true,"documentFilename":"carta.pdf","exactText":"exact text from support letter"}]}`

  const userPrompt = `REQUIREMENTS TO VERIFY:\n${reqList}\n\nSUPPORT LETTER CONTENT:\n${sustentoContent.substring(0, 30000)}`

  try {
    const apiKey = process.env.OPENAI_API_KEY
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        temperature: 0,
        seed: 42,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`)
    }

    const llmResult = await response.json()
    const content = llmResult.choices[0].message.content

    let parsed: { results?: Array<{ requirementId: string; found: boolean; documentFilename?: string; exactText?: string }> }
    try {
      parsed = JSON.parse(content)
    } catch {
      const cleaned = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
      parsed = JSON.parse(cleaned)
    }

    const results = (parsed.results || []).filter(r => r.found)
    console.log(`[analyze-sustento] LLM found ${results.length}/${requirements.length} requirements in sustento docs`)

    // Clear ALL previous sustento_links for this project before saving new results
    await supabaseAdmin
      .from('sustento_links')
      .delete()
      .eq('project_id', projectId)

    // Save results as sustento_links
    for (const result of results) {
      // Find the document ID from filename
      const matchedDoc = docTexts.find(d => d.filename === result.documentFilename) || docTexts[0]
      if (!matchedDoc) continue

      // Upsert sustento link
      const { data: existing } = await supabaseAdmin
        .from('sustento_links')
        .select('id, requirement_ids')
        .eq('project_id', projectId)
        .eq('document_id', matchedDoc.id)
        .maybeSingle()

      if (existing) {
        const merged = [...new Set([...existing.requirement_ids, result.requirementId])]
        await supabaseAdmin
          .from('sustento_links')
          .update({ requirement_ids: merged })
          .eq('id', existing.id)
      } else {
        await supabaseAdmin
          .from('sustento_links')
          .insert({
            project_id: projectId,
            analysis_id: analysisId,
            document_id: matchedDoc.id,
            requirement_ids: [result.requirementId],
          })
      }
    }

    return NextResponse.json({
      success: true,
      found: results.length,
      total: requirements.length,
      results,
    })
  } catch (err) {
    console.error('[analyze-sustento] LLM analysis failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Analysis failed' }, { status: 500 })
  }
}
