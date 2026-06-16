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
    partida?: string
    partidaDesc?: string
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
  partida?: string
  partidaDesc?: string
  requirementText?: string
}

interface ProcessedDocument {
  documentId: string
  filename: string
  documentType: string
  originalFileUrl?: string
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
  console.log('[analyze-documents] === POST HANDLER CALLED ===')
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

  console.log(`[analyze] Received: ${documents.length} docs, projectId=${projectId || 'NONE'}, analysisId=${analysisId?.substring(0,8) || 'NONE'}`)
  console.log(`[analyze] Doc URLs: ${documents.map(d => d.originalFileUrl ? 'YES' : 'NO').join(', ')}`)

  // Extract requirements from ETT document directly from DB
  // This bypasses any Server Action caching issues
  if (projectId) {
    console.log(`[analyze] Attempting ETT extraction for project: ${projectId}`)
    try {
      // Get all documents attached to this project
      const { data: projectDocs, error: pdError } = await supabaseAdmin
        .from('project_documents')
        .select('document_id')
        .eq('project_id', projectId)

      console.log(`[analyze] project_documents query: ${projectDocs?.length ?? 0} rows, error: ${pdError?.message ?? 'none'}`)

      if (projectDocs && projectDocs.length > 0) {
        const docIds = projectDocs.map(pd => pd.document_id)
        const { data: ettDocs, error: ettError } = await supabaseAdmin
          .from('documents')
          .select('id, extracted_text, document_type')
          .in('id', docIds)
          .eq('document_type', 'ett')
          .limit(1)

        console.log(`[analyze] ETT query: ${ettDocs?.length ?? 0} docs found, error: ${ettError?.message ?? 'none'}, text length: ${ettDocs?.[0]?.extracted_text?.length ?? 0}`)

        if (ettDocs && ettDocs[0]?.extracted_text) {
          const allReqs = extractETTRequirements(ettDocs[0].extracted_text)
          console.log(`[analyze] Extracted ${allReqs.length} requirements from ETT`)

          if (allReqs.length > 0) {
            const reqsForDocs = allReqs.map((r) => ({
              requirementId: r.requirementId,
              text: r.text,
              partida: r.partida,
              partidaDesc: r.partidaDesc,
              pageNumber: null as number | null,
              similarityScore: 0,
            }))
            for (const doc of documents) {
              doc.matchedRequirements = reqsForDocs
            }
            console.log(`[analyze] Assigned ${allReqs.length} requirements to ${documents.length} documents`)
          }
        } else {
          console.log('[analyze] No ETT document with extracted_text found')
        }
      } else {
        console.log('[analyze] No project_documents found for this project')
      }
    } catch (err) {
      console.error('[analyze] ETT extraction FAILED:', err instanceof Error ? err.message : err, err instanceof Error ? err.stack : '')
    }
  } else {
    console.log('[analyze] No projectId provided, skipping ETT extraction')
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

  // Process each document with LLM
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
        originalFileUrl: doc.originalFileUrl,
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
        originalFileUrl: doc.originalFileUrl,
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

    // Step 2: Two-pass analysis
    // Pass 1: Direct keyword matching (no LLM tokens needed)
    const directMatches: AnnotationResult[] = []
    const unmatchedReqs: typeof doc.matchedRequirements = []

    for (const req of doc.matchedRequirements) {
      const match = findDirectMatch(req.text, pages)
      if (match) {
        directMatches.push({
          requirementId: req.requirementId,
          found: true,
          pageNum: match.pageNum,
          exactText: match.exactText,
          confidence: 0.9,
          partida: req.partida,
          partidaDesc: req.partidaDesc,
          requirementText: req.text,
        })
      } else {
        unmatchedReqs.push(req)
      }
    }

    if (directMatches.length > 0) {
      console.log(`[analyze] ${docLabel} — direct match: ${directMatches.length}/${doc.matchedRequirements.length} found without LLM`)
    }

    // Pass 2: Send only unmatched requirements to LLM
    let llmAnnotations: AnnotationResult[] = []
    if (unmatchedReqs.length > 0) {
      await updateStage(`Analyzing ${doc.filename} with LLM (${docIdx + 1}/${totalDocs})...`)
      console.log(`[analyze] ${docLabel} — calling LLM (${pages.length} pages, ${unmatchedReqs.length} remaining reqs)`)
      const pageTexts = pages.map(p => `--- PAGE ${p.pageNum} ---\n${p.text}`).join('\n\n')
      const reqList = unmatchedReqs.map(r => `${r.requirementId}: ${r.text}`).join('\n')

      const systemPrompt = `You are a technical compliance analyst. Your job is to find evidence in a technical document (datasheet/spec sheet) that satisfies each requirement.

IMPORTANT RULES:
- Look for FUNCTIONAL EQUIVALENCE, not just exact text matches
- A requirement in Spanish like "Puerto Ethernet 10/100/1000" matches English text like "RJ-45 10/100/1000 Mbps Ethernet"
- A requirement like "Debe soportar 600 LBS" matches "Holding force: 600 lbs (2700N)"
- Technical specs often use abbreviations, different units, or different terminology for the same thing
- If the document clearly provides the capability described in the requirement, mark it as found
- Return the EXACT text fragment from the PDF that proves compliance (do not paraphrase)
- If you cannot find clear evidence of compliance, set found to false
- Include the page number where evidence was found
- Each evidence fragment: 1-3 sentences max

Respond in JSON ONLY:
{"annotations":[{"requirementId":"REQ-001","found":true,"pageNum":2,"exactText":"exact text from PDF here","confidence":0.85}]}`

      const userPrompt = `TECHNICAL REQUIREMENTS TO VERIFY:\n${reqList}\n\nDOCUMENT CONTENT:\n${pageTexts}`

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
        // Enrich LLM annotations with partida info from the original requirements
        llmAnnotations = annotations.map(ann => {
          const origReq = unmatchedReqs.find(r => r.requirementId === ann.requirementId)
          return { ...ann, partida: origReq?.partida, partidaDesc: origReq?.partidaDesc, requirementText: origReq?.text }
        })
      } catch (err) {
        console.error(`[analyze] ${docLabel} — LLM FAILED:`, err instanceof Error ? err.message : err)
        llmAnnotations = unmatchedReqs.map(r => ({
          requirementId: r.requirementId,
          found: false,
          pageNum: null,
          exactText: null,
          confidence: 0,
          partida: r.partida,
          partidaDesc: r.partidaDesc,
          requirementText: r.text,
        }))
      }
    } // end if unmatchedReqs.length > 0

    // Merge direct matches + LLM results
    const allAnnotations = [...directMatches, ...llmAnnotations]
    const totalFound = allAnnotations.filter(a => a.found).length
    console.log(`[analyze] ${docLabel} — TOTAL: ${totalFound}/${doc.matchedRequirements.length} requirements found (${directMatches.length} direct + ${llmAnnotations.filter(a => a.found).length} LLM)`)

    results.push({
      documentId: doc.documentId,
      filename: doc.filename,
      documentType: doc.documentType,
      originalFileUrl: doc.originalFileUrl,
      annotations: allAnnotations,
      annotationCount: totalFound,
    })
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


// ---------------------------------------------------------------------------
// Inline ETT requirement extraction (avoids server-only import issues)
// ---------------------------------------------------------------------------

const SPEC_STARTERS = [
  /^Debe\b/i, /^Deberá\b/i, /^Puerto[s]?\b/i, /^Incluir\b/i, /^Incluye\b/i,
  /^Soporta[r]?\b/i, /^Voltaje\b/i, /^Protección\b/i, /^Temperatura\b/i,
  /^Humedad\b/i, /^Algoritmo\b/i, /^Certificación\b/i, /^Listado\s+por\b/i,
  /^Procesador\b/i, /^Frecuencia\b/i, /^Memoria\b/i, /^Almacenamiento\b/i,
  /^Arquitectura\b/i, /^Unidad\b/i, /^Tarjeta\b/i, /^Material\b/i,
  /^Tipo\s+de\b/i, /^Licencia\b/i, /^Autenticación\b/i,
  /^El\s+controlador\b/i, /^El\s+sistema\b/i, /^La\s+(identificación|interfaz|comunicación)\b/i,
  /^Los\s+controladores\b/i, /^Se\s+(listan|pueden|instalará|debe|requiere)\b/i,
  /^Reporte\b/i, /^Informe\b/i, /^Reportes\b/i,
  /^Alarma[s]?\b/i, /^Las\s+alarmas\b/i,
  /^\d{2,4}\s*(GB|MB|TB|MHz|GHz|Mbps|VDC|VAC|LBS|bits)\b/i,
  /^\d+\s*(puertos?|entradas?|salidas?|núcleos?)\b/i,
  /^Mínimo\b/i, /^Máximo\b/i,
  /^LED\b/i, /^RS-485\b/i, /^Wiegand\b/i, /^IP\d{2}\b/i,
  /^Con\s+(reducción|optimizador|protección)\b/i,
]

const ETT_NOISE = [
  /^NUEVO HOSPITAL/i, /^.Mejoramiento/i, /^Provincia de Lambayeque/i,
  /^Av\.\s*Circunvalaci/i, /Página\s*\d+/i, /Santiago de Surco/i,
  /^--- Page \d+ ---$/,
]

const ETT_PARTIDA = /^(\d{2}\.\d{2}(?:\.\d{2}){0,2})\s+(.+)/

function extractETTRequirements(rawText: string): Array<{ requirementId: string; text: string; partida: string; partidaDesc: string }> {
  // Normalize text first: split long lines on spec-start boundaries
  const normalized = normalizeETTText(rawText)
  const lines = normalized.split('\n')
  const requirements: Array<{ requirementId: string; text: string; partida: string; partidaDesc: string }> = []
  let currentReqLines: string[] = []
  let inTargetSection = false
  let reqCounter = 0
  let currentPartida = ''
  let currentPartidaDesc = ''

  function flush() {
    if (currentReqLines.length === 0) return
    const text = currentReqLines.join('\n').trim()
    if (text.length < 15) { currentReqLines = []; return }
    reqCounter++
    requirements.push({
      requirementId: `REQ-${String(reqCounter).padStart(3, '0')}`,
      text,
      partida: currentPartida,
      partidaDesc: currentPartidaDesc,
    })
    currentReqLines = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (ETT_NOISE.some(p => p.test(trimmed))) continue

    const partidaMatch = trimmed.match(ETT_PARTIDA)
    if (partidaMatch) {
      flush()
      inTargetSection = partidaMatch[1].startsWith('06.11')
      if (inTargetSection) {
        currentPartida = partidaMatch[1]
        currentPartidaDesc = partidaMatch[2].trim()
      }
      continue
    }

    if (!inTargetSection) continue

    // Bullet-prefixed lines
    if (/^\s*[•\-]\s+|^\s*o\s{2,}|^\s*\d+[.)]\s+/.test(trimmed)) {
      flush()
      const cleaned = trimmed
        .replace(/^\s*[•\-]\s+/, '')
        .replace(/^\s*o\s{2,}/, '')
        .replace(/^\s*\d+[.)]\s+/, '')
      currentReqLines.push(cleaned)
      continue
    }

    // Spec starter patterns
    if (SPEC_STARTERS.some(p => p.test(trimmed))) {
      flush()
      currentReqLines.push(trimmed)
      continue
    }

    // Continuation
    if (currentReqLines.length > 0 && trimmed.length < 250) {
      if (/^[A-Z\u00C0-\u00DC]{4,}(\s+[A-Z\u00C0-\u00DC]+)*$/.test(trimmed)) { flush(); continue }
      currentReqLines.push(trimmed)
    }
  }

  flush()
  return requirements
}

function normalizeETTText(text: string): string {
  let r = text.replace(/--- Page \d+ ---/g, '\n')

  // Split before partida numbers
  r = r.replace(/(\s)(\d{2}\.\d{2}\.\d{2}\.\d{2}\s)/g, '\n$2')
  r = r.replace(/(\s)(\d{2}\.\d{2}\.\d{2}\s)/g, '\n$2')
  r = r.replace(/(\s)(\d{2}\.\d{2}\s)/g, '\n$2')

  // Split before spec-start keywords when preceded by period+space or double-space
  const splitKeywords = [
    'Debe ', 'Incluir ', 'Incluye ', 'Puerto ', 'Procesador ', 'Frecuencia ',
    'Memoria ', 'Almacenamiento ', 'Arquitectura ', 'Tarjeta ', 'Sistema ',
    'Unidad ', 'El controlador ', 'El sistema ', 'Los controladores ',
    'La identificaci', 'Reporte de ', 'Informe de ', 'Reportes ',
    'Alarma ', 'Las alarmas ', 'Soporta ', 'Voltaje ', 'Protecci',
    'Temperatura ', 'Humedad ', 'Algoritmo ', 'Certificaci', 'Listado por ',
    'Material:', 'Licencia ', 'Autenticaci',
  ]

  for (const kw of splitKeywords) {
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Split after period/exclamation/question + space + keyword
    r = r.replace(new RegExp(`([.!?])\\s+(${esc})`, 'g'), '$1\n$2')
    // Split after double-space + keyword
    r = r.replace(new RegExp(`(\\s{2,})(${esc})`, 'g'), '\n$2')
    // Split after single space + keyword (common in DB text)
    r = r.replace(new RegExp(`(\\S)\\s(${esc})`, 'g'), '$1\n$2')
  }

  // Split on bullet patterns
  r = r.replace(/\s+(o\s{2,})/g, '\n$1')

  return r
}


// ---------------------------------------------------------------------------
// Direct keyword matching (Pass 1 - no LLM needed)
// ---------------------------------------------------------------------------

function findDirectMatch(
  requirementText: string,
  pages: Array<{ pageNum: number; text: string }>
): { pageNum: number; exactText: string } | null {
  // Extract significant keywords from the requirement (4+ chars, no stop words)
  const stopWords = new Set([
    'debe', 'para', 'como', 'sera', 'este', 'esta', 'todo', 'cada', 'pueden',
    'tiene', 'desde', 'hasta', 'mismo', 'donde', 'cuando', 'sobre', 'entre',
    'incluir', 'superior', 'similar', 'correspondiente', 'sistema', 'general',
  ])

  const words = requirementText
    .toLowerCase()
    .replace(/[^a-záéíóúñ0-9\s\-\/\.]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !stopWords.has(w))

  if (words.length === 0) return null

  // Need at least 60% of significant words to match on a single page
  const threshold = Math.max(2, Math.ceil(words.length * 0.6))

  for (const page of pages) {
    const pageTextLower = page.text.toLowerCase()
    const matchedWords = words.filter(w => pageTextLower.includes(w))

    if (matchedWords.length >= threshold) {
      // Find the best matching sentence/fragment
      const sentences = page.text.split(/[.!?\n]/).filter(s => s.trim().length > 10)
      let bestSentence = ''
      let bestScore = 0

      for (const sentence of sentences) {
        const sentLower = sentence.toLowerCase()
        const score = matchedWords.filter(w => sentLower.includes(w)).length
        if (score > bestScore) {
          bestScore = score
          bestSentence = sentence.trim()
        }
      }

      if (bestSentence) {
        return {
          pageNum: page.pageNum,
          exactText: bestSentence.substring(0, 200),
        }
      }
    }
  }

  return null
}
