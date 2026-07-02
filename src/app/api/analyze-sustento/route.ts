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

  // Clear sustento carpeta digital URL since sustento results are changing
  await supabaseAdmin
    .from('analysis_results')
    .update({ sustento_carpeta_digital_url: null })
    .eq('project_id', projectId)

  console.log(`[analyze-sustento] Project: ${projectId}, Reqs: ${requirements.length}, Sustento docs: ${documentIds.length}`)

  // Get sustento document content
  const { data: docs } = await supabaseAdmin
    .from('documents')
    .select('id, filename, original_file_url, extracted_text')
    .in('id', documentIds)

  if (!docs || docs.length === 0) {
    return NextResponse.json({ error: 'No sustento documents found' }, { status: 400 })
  }

  // Extract text from sustento docs with page numbers for precise annotation
  const docTexts: Array<{ id: string; filename: string; text: string; pages: Array<{ pageNum: number; text: string }> }> = []
  for (const doc of docs) {
    if (doc.original_file_url) {
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
          const pages = result.text.map((pageText, idx) => ({ pageNum: idx + 1, text: pageText }))
          docTexts.push({ id: doc.id, filename: doc.filename, text: pages.map(p => p.text).join('\n'), pages })
        }
      } catch (err) {
        console.error(`[analyze-sustento] Failed to extract text from ${doc.filename}:`, err)
      }
    } else if (doc.extracted_text) {
      docTexts.push({ id: doc.id, filename: doc.filename, text: doc.extracted_text, pages: [{ pageNum: 1, text: doc.extracted_text }] })
    }
  }

  if (docTexts.length === 0) {
    return NextResponse.json({ error: 'Could not extract text from sustento documents' }, { status: 400 })
  }

  console.log(`[analyze-sustento] Extracted text from ${docTexts.length} docs`)

  // Load LLM config for this project
  const { data: projectData } = await supabaseAdmin
    .from('projects')
    .select('metadata')
    .eq('id', projectId)
    .single()
  const llmConfig = ((projectData?.metadata ?? {}) as Record<string, unknown>).llmConfig as {
    model?: string; temperature?: number; strictness?: string; maxExactTextLength?: number; maxContextChars?: number
  } | undefined

  const model = llmConfig?.model || 'openai/gpt-4o'
  const temperature = llmConfig?.temperature ?? 0

  // Build strictness instruction
  let strictnessRule = 'Mark as found if the document reasonably demonstrates the capability'
  if (llmConfig?.strictness === 'strict') {
    strictnessRule = 'Only mark as found if there is CLEAR and EXPLICIT evidence. Do NOT guess.'
  } else if (llmConfig?.strictness === 'permissive') {
    strictnessRule = 'Mark as found if there is any reasonable indication of compliance. When in doubt, mark as found.'
  }

  console.log(`[analyze-sustento] LLM Config: model=${model}, temp=${temperature}, strictness=${llmConfig?.strictness ?? 'balanced'}`)

  // Combine all sustento text with page markers for LLM analysis
  const sustentoContent = docTexts.map(d => {
    const pagesText = d.pages.map(p => `--- PAGE ${p.pageNum} ---\n${p.text}`).join('\n\n')
    return `=== DOCUMENT: ${d.filename} ===\n${pagesText}`
  }).join('\n\n')

  // Build requirement list
  const reqList = requirements.map(r => `${r.requirementId}: ${r.text}`).join('\n')

  // Call LLM to find which requirements are covered by sustento docs
  const systemPrompt = `You are a compliance analyst for Peruvian public procurement. You verify whether support letters (cartas de sustento) from manufacturers/distributors provide evidence that specific technical requirements are met.

CONTEXT:
- Support letters are official documents from manufacturers confirming product capabilities
- They typically state: "Se aclara y confirma que [product] [meets requirement]"
- Requirements come from an ETT (technical specifications document)
- The letters may cover multiple products and requirements in a single document
- The document content is organized by pages (PAGE 1, PAGE 2, etc.)

MATCHING RULES:
- A direct statement like "Se aclara y confirma que..." is strong evidence
- Certifications mentioned (CE, UL, FCC, etc.) satisfy "certificacion UL o similar"
- Model numbers confirming capability satisfy the requirement
- ${strictnessRule}
- Partial or ambiguous mentions are NOT sufficient

EVIDENCE RULES:
- exactText must be the SPECIFIC sentence or clause that proves compliance (max 80 chars)
- Copy the text VERBATIM from the support letter - do NOT paraphrase
- GOOD examples: "Se aclara y confirma que el controlador permite supervision de cableado."
- BAD examples: long paragraphs combining multiple statements
- Prefer sentences starting with "Se aclara y confirma..." when available
- Include the page number (pageNum) where the evidence was found
- Include the document filename

Respond in JSON ONLY:
{"results":[{"requirementId":"REQ-001","found":true,"documentFilename":"carta.pdf","pageNum":1,"exactText":"Se aclara y confirma que el controlador soporta..."}]}`

  const userPrompt = `REQUIREMENTS TO VERIFY:\n${reqList}\n\nSUPPORT LETTER CONTENT:\n${sustentoContent.substring(0, 50000)}`

  console.log(`[analyze-sustento] Requirements: ${requirements.length}, Content: ${sustentoContent.length} chars`)

  try {
    const apiKey = process.env.OPENAI_API_KEY
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature,
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

    let parsed: { results?: Array<{ requirementId: string; found: boolean; documentFilename?: string; pageNum?: number; exactText?: string }> }
    try {
      parsed = JSON.parse(content)
    } catch {
      const cleaned = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
      parsed = JSON.parse(cleaned)
    }

    const results = (parsed.results || []).filter(r => r.found)
    console.log(`[analyze-sustento] LLM found ${results.length}/${requirements.length} requirements in sustento docs`)
    console.log(`[analyze-sustento] LLM raw results count: ${(parsed.results || []).length}, found: ${results.length}, not found: ${(parsed.results || []).length - results.length}`)
    // Log each result for debugging
    for (const r of (parsed.results || []).slice(0, 20)) {
      console.log(`[analyze-sustento]   ${r.requirementId}: found=${r.found}${r.found ? `, page=${r.pageNum}, text="${(r.exactText || '').substring(0, 60)}..."` : ''}`)
    }

    // Clear ALL previous sustento_links for this project before saving new results
    await supabaseAdmin
      .from('sustento_links')
      .delete()
      .eq('project_id', projectId)

    // Save results as sustento_links (grouped by document)
    // Also save requirement_matches with exactText and pageNum for PDF annotation
    const docGroups = new Map<string, { reqIds: string[]; matches: Record<string, string> }>()

    for (const result of results) {
      const matchedDoc = docTexts.find(d => d.filename === result.documentFilename) || docTexts[0]
      if (!matchedDoc) continue

      if (!docGroups.has(matchedDoc.id)) {
        docGroups.set(matchedDoc.id, { reqIds: [], matches: {} })
      }
      const group = docGroups.get(matchedDoc.id)!
      group.reqIds.push(result.requirementId)
      if (result.exactText) {
        // Store exactText with optional page prefix for annotation
        const prefix = result.pageNum ? `[p${result.pageNum}]` : ''
        group.matches[result.requirementId] = `${prefix}${result.exactText}`
      }
    }

    for (const [docId, group] of docGroups) {
      await supabaseAdmin
        .from('sustento_links')
        .insert({
          project_id: projectId,
          analysis_id: analysisId,
          document_id: docId,
          requirement_ids: group.reqIds,
          requirement_matches: group.matches,
        })
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
