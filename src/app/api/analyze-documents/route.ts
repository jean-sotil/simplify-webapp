import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db.server'
import { revalidatePath } from 'next/cache'
import { generateAnalysisResults } from '@/lib/analysis/generate-results'

export const maxDuration = 300

interface DocumentInput {
  documentId: string
  filename: string
  documentType: string
  originalFileUrl: string
  matchedRequirements: Array<{
    requirementId: string
    text: string
    pageNumber?: number | null
    similarityScore?: number
  }>
}

interface AnnotationResult {
  requirementId: string
  found: boolean
  pageNum: number | null
  exactText: string | null
  confidence: number
}

interface ProcessedDocument {
  documentId: string
  filename: string
  documentType: string
  annotations: AnnotationResult[]
  annotationCount: number
}

/**
 * POST /api/analyze-documents
 *
 * Processes multiple documents: extracts text, calls LLM to find evidence,
 * returns all results in one response. Designed to be called by n8n in a
 * single request to avoid batching issues.
 *
 * Body: {
 *   documents: DocumentInput[],
 *   blobToken: string,
 *   openrouterKey: string
 * }
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { documents, blobToken, openrouterKey, analysisId, projectId } = body as {
    documents: DocumentInput[]
    blobToken?: string
    openrouterKey?: string
    analysisId?: string
    projectId?: string
  }

  if (!documents?.length) {
    return NextResponse.json({ error: 'No documents provided' }, { status: 400 })
  }

  // Helper to update processing stage in DB (accumulates as a log)
  const stageLog: Array<{ time: string; message: string }> = []
  async function updateStage(stage: string) {
    if (!analysisId) return
    console.log(`[analyze] [${analysisId.substring(0, 8)}] Stage: ${stage}`)
    stageLog.push({ time: new Date().toISOString(), message: stage })
    await supabaseAdmin.from('analysis_results').update({
      analysis_metadata: {
        stage,
        stageLog,
        updatedAt: new Date().toISOString(),
      },
    }).eq('id', analysisId)
  }

  // Mock mode: return fake results without calling LLM or downloading PDFs
  const useMock = process.env.MOCK_ANALYSIS === 'true' || body.mock === true
  if (useMock) {
    console.log(`[analyze] [${analysisId?.substring(0, 8) ?? 'no-id'}] MOCK MODE enabled`)
    await updateStage('Generating mock results...')

    const mockResults: ProcessedDocument[] = documents.map(doc => ({
      documentId: doc.documentId,
      filename: doc.filename,
      documentType: doc.documentType,
      originalFileUrl: doc.originalFileUrl,
      annotations: (doc.matchedRequirements || []).map(req => ({
        requirementId: req.requirementId,
        found: true,
        pageNum: req.pageNumber ?? Math.ceil(Math.random() * 5),
        exactText: `[MOCK] Evidence found for: ${req.text.substring(0, 60)}...`,
        confidence: 0.85,
      })),
      annotationCount: (doc.matchedRequirements || []).length,
    }))

    const responseData = {
      processedDocs: mockResults,
      totalDocuments: mockResults.length,
      totalAnnotations: mockResults.reduce((sum, d) => sum + d.annotationCount, 0),
      generatedAt: new Date().toISOString(),
    }

    if (analysisId) {
      // Generate ZIP with Excel results even in mock mode
      await updateStage('Generating compliance matrix (Excel)...')
      let zipFileUrl: string | null = null
      try {
        let projectName = 'Analysis'
        if (projectId) {
          const { data: project } = await supabaseAdmin
            .from('projects').select('name').eq('id', projectId).single()
          if (project) projectName = project.name
        }

        await updateStage('Creating ZIP package...')
        zipFileUrl = await generateAnalysisResults({
          processedDocs: mockResults,
          analysisId,
          projectName,
          blobToken: process.env.BLOB_READ_WRITE_TOKEN,
          onStage: updateStage,
        })
        console.log(`[analyze] [${analysisId.substring(0, 8)}] ZIP uploaded: ${zipFileUrl}`)
        await updateStage('Saving results...')
      } catch (err) {
        console.error(`[analyze] [${analysisId.substring(0, 8)}] ZIP generation failed:`, err)
      }

      await supabaseAdmin.from('analysis_results').update({
        status: 'completed',
        zip_file_url: zipFileUrl,
        analysis_metadata: {
          documentCount: responseData.totalDocuments,
          totalAnnotations: responseData.totalAnnotations,
          processedDocuments: responseData.processedDocs,
          generatedAt: responseData.generatedAt,
        },
        completed_at: new Date().toISOString(),
      }).eq('id', analysisId)

      if (projectId) {
        revalidatePath(`/[lang]/projects/${projectId}`, 'page')
      }
    }

    return NextResponse.json(responseData)
  }

  const results: ProcessedDocument[] = []
  const totalDocs = documents.length

  for (let docIdx = 0; docIdx < documents.length; docIdx++) {
    const doc = documents[docIdx]
    const docLabel = `[${docIdx + 1}/${totalDocs}] ${doc.filename}`

    // Skip docs with no matched requirements
    if (!doc.matchedRequirements || doc.matchedRequirements.length === 0) {
      console.log(`[analyze] ${docLabel} — no requirements, skipping`)
      results.push({
        documentId: doc.documentId,
        filename: doc.filename,
        documentType: doc.documentType,
        annotations: [],
        annotationCount: 0,
      })
      continue
    }

    await updateStage(`Extracting text from ${doc.filename} (${docIdx + 1}/${totalDocs})...`)
    console.log(`[analyze] ${docLabel} — extracting text (${doc.matchedRequirements.length} requirements)`)

    // Step 1: Extract text from PDF
    let pages: Array<{ pageNum: number; text: string }> = []
    try {
      const headers: Record<string, string> = {}
      if (blobToken) {
        headers['Authorization'] = `Bearer ${blobToken}`
      } else if (process.env.BLOB_READ_WRITE_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }

      const pdfResponse = await fetch(doc.originalFileUrl, { headers })
      if (!pdfResponse.ok) {
        throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`)
      }

      const buffer = await pdfResponse.arrayBuffer()
      const { extractText } = await import('unpdf')
      const result = await extractText(new Uint8Array(buffer), { mergePages: false })
      pages = result.text.map((text, i) => ({ pageNum: i + 1, text: text.trim() }))
    } catch (err) {
      console.error(`[analyze-documents] PDF extraction failed for ${doc.filename}:`, err)
      results.push({
        documentId: doc.documentId,
        filename: doc.filename,
        documentType: doc.documentType,
        annotations: doc.matchedRequirements.map(r => ({
          requirementId: r.requirementId,
          found: false,
          pageNum: null,
          exactText: null,
          confidence: 0,
        })),
        annotationCount: 0,
      })
      continue
    }

    // Step 2: Call LLM to identify evidence
    await updateStage(`Analyzing ${doc.filename} with LLM (${docIdx + 1}/${totalDocs})...`)
    console.log(`[analyze] ${docLabel} — calling LLM (${pages.length} pages, ${doc.matchedRequirements.length} reqs)`)
    const pageTexts = pages.map(p => `--- PAGE ${p.pageNum} ---\n${p.text}`).join('\n\n')
    const reqList = doc.matchedRequirements.map(r => `${r.requirementId}: ${r.text}`).join('\n')

    const systemPrompt = `You are a technical document analyst. Find the EXACT text fragments in a PDF that provide evidence for each technical requirement.

Rules:
- Return the EXACT text as it appears in the PDF (do not paraphrase)
- If the requirement is in Spanish but the PDF is in English, find the English text that satisfies it
- If the requirement is in Spanish and the PDF is also in Spanish, find the matching Spanish text
- If you cannot find clear evidence, set found to false
- Each fragment: 1-3 sentences max (minimum needed to prove compliance)
- Include the page number where you found it

Respond in JSON ONLY:
{"annotations":[{"requirementId":"REQ-001","found":true,"pageNum":1,"exactText":"text from PDF","confidence":0.95}]}`

    const userPrompt = `REQUIREMENTS TO FIND:\n${reqList}\n\nPDF CONTENT:\n${pageTexts}`

    try {
      const apiKey = openrouterKey || process.env.OPENAI_API_KEY
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o',
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`)
      }

      const llmResult = await response.json()
      const content = llmResult.choices[0].message.content

      let parsed: { annotations?: AnnotationResult[] }
      try {
        parsed = JSON.parse(content)
      } catch {
        const cleaned = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
        parsed = JSON.parse(cleaned)
      }

      const annotations = parsed.annotations || []
      const foundCount = annotations.filter(a => a.found).length
      console.log(`[analyze] ${docLabel} — LLM done: ${foundCount}/${annotations.length} requirements found`)
      results.push({
        documentId: doc.documentId,
        filename: doc.filename,
        documentType: doc.documentType,
        annotations,
        annotationCount: foundCount,
      })
    } catch (err) {
      console.error(`[analyze] ${docLabel} — LLM FAILED:`, err instanceof Error ? err.message : err)
      results.push({
        documentId: doc.documentId,
        filename: doc.filename,
        documentType: doc.documentType,
        annotations: doc.matchedRequirements.map(r => ({
          requirementId: r.requirementId,
          found: false,
          pageNum: null,
          exactText: null,
          confidence: 0,
        })),
        annotationCount: 0,
      })
    }
  }

  const responseData = {
    processedDocs: results,
    totalDocuments: results.length,
    totalAnnotations: results.reduce((sum, d) => sum + d.annotationCount, 0),
    generatedAt: new Date().toISOString(),
  }

  // Generate deliverables (Excel + annotated PDFs + ZIP) and upload
  console.log(`[analyze] All documents processed. Generating deliverables...`)
  await updateStage('Generating compliance matrix (Excel) and ZIP...')
  let zipFileUrl: string | null = null
  if (analysisId && results.some(d => d.annotationCount > 0)) {
    try {
      // Get project name for the filename
      let projectName = 'Analysis'
      if (projectId) {
        const { data: project } = await supabaseAdmin
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single()
        if (project) projectName = project.name
      }

      zipFileUrl = await generateAnalysisResults({
        processedDocs: results,
        analysisId,
        projectName,
        blobToken: blobToken || process.env.BLOB_READ_WRITE_TOKEN,
        onStage: updateStage,
      })
      console.log('[analyze-documents] ZIP generated:', zipFileUrl)
    } catch (err) {
      console.error('[analyze-documents] Failed to generate results ZIP:', err)
    }
  }

  // If analysisId is provided, update the analysis_results row directly
  if (analysisId) {
    try {
      await supabaseAdmin.from('analysis_results').update({
        status: 'completed',
        zip_file_url: zipFileUrl,
        analysis_metadata: {
          documentCount: responseData.totalDocuments,
          totalAnnotations: responseData.totalAnnotations,
          processedDocuments: responseData.processedDocs,
          generatedAt: responseData.generatedAt,
        },
        completed_at: new Date().toISOString(),
      }).eq('id', analysisId)

      if (projectId) {
        revalidatePath(`/[lang]/projects/${projectId}`, 'page')
      }
    } catch (err) {
      console.error('[analyze-documents] Failed to update analysis_results:', err)
      await supabaseAdmin.from('analysis_results').update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Failed to save results',
      }).eq('id', analysisId)
    }
  }

  return NextResponse.json(responseData)
}
