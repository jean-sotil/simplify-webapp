import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

interface DocumentInput {
  documentId: string
  filename: string
  documentType: string
  originalFileUrl: string
  matchedRequirements: Array<{
    requirementId: string
    text: string
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
  const { documents, blobToken, openrouterKey } = body as {
    documents: DocumentInput[]
    blobToken: string
    openrouterKey: string
  }

  if (!documents?.length) {
    return NextResponse.json({ error: 'No documents provided' }, { status: 400 })
  }

  const results: ProcessedDocument[] = []

  for (const doc of documents) {
    // Skip docs with no matched requirements
    if (!doc.matchedRequirements || doc.matchedRequirements.length === 0) {
      results.push({
        documentId: doc.documentId,
        filename: doc.filename,
        documentType: doc.documentType,
        annotations: [],
        annotationCount: 0,
      })
      continue
    }

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
      results.push({
        documentId: doc.documentId,
        filename: doc.filename,
        documentType: doc.documentType,
        annotations,
        annotationCount: annotations.filter(a => a.found).length,
      })
    } catch (err) {
      console.error(`[analyze-documents] LLM call failed for ${doc.filename}:`, err)
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

  return NextResponse.json({
    processedDocs: results,
    totalDocuments: results.length,
    totalAnnotations: results.reduce((sum, d) => sum + d.annotationCount, 0),
    generatedAt: new Date().toISOString(),
  })
}
