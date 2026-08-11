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

  // Track total requirements extracted from ETT (before routing)
  let ettTotalRequirements = 0
  let ettAllRequirements: Array<{ requirementId: string; text: string; partida: string; partidaDesc: string }> = []

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

  // Extract requirements from ETT document directly from DB
  // This bypasses any Server Action caching issues
  if (projectId) {
    await updateStage('Extracting requirements from ETT...')
    console.log(`[analyze] Attempting ETT extraction for project: ${projectId}`)
    try {
      // Get all documents attached to this project (try project_analysis_documents first, fallback to project_documents)
      let docIds: string[] = []
      
      const { data: analysisDocRows, error: adError } = await supabaseAdmin
        .from('project_analysis_documents')
        .select('document_id')
        .eq('project_id', projectId)

      console.log(`[analyze] project_analysis_documents query: ${analysisDocRows?.length ?? 0} rows, error: ${adError?.message ?? 'none'}`)

      if (analysisDocRows && analysisDocRows.length > 0) {
        docIds = analysisDocRows.map(pd => pd.document_id)
      } else {
        // Fallback to legacy project_documents table
        const { data: projectDocs, error: pdError } = await supabaseAdmin
          .from('project_documents')
          .select('document_id')
          .eq('project_id', projectId)

        console.log(`[analyze] project_documents fallback query: ${projectDocs?.length ?? 0} rows, error: ${pdError?.message ?? 'none'}`)
        if (projectDocs && projectDocs.length > 0) {
          docIds = projectDocs.map(pd => pd.document_id)
        }
      }

      if (docIds.length > 0) {
        const { data: ettDocs, error: ettError } = await supabaseAdmin
          .from('documents')
          .select('id, extracted_text, document_type')
          .in('id', docIds)
          .eq('document_type', 'ett')

        console.log(`[analyze] ETT query: ${ettDocs?.length ?? 0} docs found, error: ${ettError?.message ?? 'none'}`)

        if (ettDocs && ettDocs.length > 0) {
          // Extract requirements from ALL ETT documents using LLM
          const allReqs: Array<{ requirementId: string; text: string; partida: string; partidaDesc: string }> = []
          let reqCounter = 0

          // Load LLM config
          const { data: projectConf } = await supabaseAdmin
            .from('projects')
            .select('metadata')
            .eq('id', projectId)
            .single()
          const llmConf = ((projectConf?.metadata ?? {}) as Record<string, unknown>).llmConfig as {
            model?: string; temperature?: number
          } | undefined
          const extractionModel = llmConf?.model || 'openai/gpt-4o'
          const apiKey = openrouterKey || process.env.OPENAI_API_KEY

          for (const ettDoc of ettDocs) {
            if (!ettDoc.extracted_text) continue
            const ettText = ettDoc.extracted_text as string

            // Try regex first (fast, free)
            const regexReqs = extractETTRequirements(ettText)
            console.log(`[analyze] ETT ${ettDoc.id.substring(0, 8)}: regex extracted ${regexReqs.length} requirements (${ettText.length} chars)`)

            if (regexReqs.length >= 5) {
              // Regex worked well enough, use its results
              for (const req of regexReqs) {
                reqCounter++
                allReqs.push({ ...req, requirementId: `REQ-${String(reqCounter).padStart(3, '0')}` })
              }
            } else {
              // Regex failed — use LLM to extract requirements
              console.log(`[analyze] ETT ${ettDoc.id.substring(0, 8)}: regex insufficient, using LLM extraction...`)
              await updateStage(`Extracting requirements with AI (${ettText.length} chars)...`)
              try {
                const llmReqs = await extractRequirementsWithLLM(ettText, extractionModel, apiKey!)
                console.log(`[analyze] ETT ${ettDoc.id.substring(0, 8)}: LLM extracted ${llmReqs.length} requirements`)
                for (const req of llmReqs) {
                  reqCounter++
                  allReqs.push({ ...req, requirementId: `REQ-${String(reqCounter).padStart(3, '0')}` })
                }
              } catch (llmErr) {
                console.error(`[analyze] ETT ${ettDoc.id.substring(0, 8)}: LLM extraction failed:`, llmErr instanceof Error ? llmErr.message : llmErr)
                // Use whatever regex gave us as fallback
                for (const req of regexReqs) {
                  reqCounter++
                  allReqs.push({ ...req, requirementId: `REQ-${String(reqCounter).padStart(3, '0')}` })
                }
              }
            }
          }
          console.log(`[analyze] Total extracted ${allReqs.length} requirements from ${ettDocs.length} ETT(s)`)

          ettTotalRequirements = allReqs.length
          ettAllRequirements = allReqs

          if (allReqs.length > 0) {
            // Send all requirements to all documents
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
        console.log('[analyze] No documents found for this project in project_analysis_documents or project_documents')
      }
    } catch (err) {
      console.error('[analyze] ETT extraction FAILED:', err instanceof Error ? err.message : err, err instanceof Error ? err.stack : '')
    }
  } else {
    console.log('[analyze] No projectId provided, skipping ETT extraction')
  }

  // Step 2: Smart classification — use LLM to determine which document belongs to which partida
  // This prevents sending irrelevant requirements to wrong documents
  const firstDocReqs = documents[0]?.matchedRequirements || []
  if (firstDocReqs.length > 0 && documents.length > 1) {
    await updateStage('Classifying documents by partida...')
    console.log('[analyze] Starting document classification...')
    
    try {
      // Get unique partidas from requirements
      const partidas = [...new Set(firstDocReqs.map(r => `${r.partida}: ${r.partidaDesc}`))]

      // Fetch first-page text for each doc
      const docFirstPages: Array<{ filename: string; documentId: string; firstPageText: string }> = []
      for (const doc of documents) {
        try {
          const headers: Record<string, string> = {}
          if (process.env.BLOB_READ_WRITE_TOKEN) {
            headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
          }
          const res = await fetch(doc.originalFileUrl, { headers })
          if (res.ok) {
            const buffer = await res.arrayBuffer()
            const { extractText } = await import('unpdf')
            const result = await extractText(new Uint8Array(buffer), { mergePages: false })
            const firstPage = (result.text[0] || '').substring(0, 500)
            docFirstPages.push({ filename: doc.filename, documentId: doc.documentId, firstPageText: firstPage })
          }
        } catch {
          docFirstPages.push({ filename: doc.filename, documentId: doc.documentId, firstPageText: doc.filename })
        }
      }

      // Ask LLM to classify
      const classificationPrompt = `You are classifying technical documents for a Peruvian public procurement project.

Given these PARTIDAS (equipment categories):
${partidas.map((p, i) => `${i + 1}. ${p}`).join('\n')}

And these DOCUMENTS (vendor datasheets):
${docFirstPages.map((d, i) => `${i + 1}. "${d.filename}" - First page: "${d.firstPageText.substring(0, 200)}"`).join('\n')}

For each document, determine which partida(s) it belongs to. A document belongs to a partida if it is the actual product/device described by that partida.

IMPORTANT: If a document is NOT related to ANY partida (e.g., a video capture card for a security/access control project), mark it as "none".

Respond in JSON ONLY:
{"classifications":[{"filename":"doc.pdf","partidas":["06.11.01.01","06.11.01.04"]},{"filename":"unrelated.pdf","partidas":[]}]}`

      const apiKey = openrouterKey || process.env.OPENAI_API_KEY
      const { data: projectData } = await supabaseAdmin
        .from('projects')
        .select('metadata')
        .eq('id', projectId)
        .single()
      const llmConfig = ((projectData?.metadata ?? {}) as Record<string, unknown>).llmConfig as {
        model?: string; temperature?: number
      } | undefined
      const classModel = llmConfig?.model || 'openai/gpt-4o'

      const classResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: classModel,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: classificationPrompt },
            { role: 'user', content: 'Classify the documents.' },
          ],
        }),
      })

      if (classResponse.ok) {
        const classResult = await classResponse.json()
        const classContent = classResult.choices[0].message.content
        let parsed: { classifications?: Array<{ filename: string; partidas: string[] }> }
        try {
          parsed = JSON.parse(classContent)
        } catch {
          parsed = JSON.parse(classContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim())
        }

        const classifications = parsed.classifications || []
        console.log(`[analyze] Classification results:`)
        
        // Build a map: documentId -> allowed partidas
        const docPartidaMap = new Map<string, Set<string>>()
        for (const cls of classifications) {
          const doc = docFirstPages.find(d => d.filename === cls.filename)
          if (doc) {
            docPartidaMap.set(doc.documentId, new Set(cls.partidas))
            console.log(`[analyze]   ${cls.filename}: ${cls.partidas.length > 0 ? cls.partidas.join(', ') : 'EXCLUDED (no match)'}`)
          }
        }

        // Filter: only EXCLUDE documents that are clearly not related (empty partidas)
        // Do NOT filter requirements within a document — let the analysis LLM decide
        for (const doc of documents) {
          const allowedPartidas = docPartidaMap.get(doc.documentId)
          if (allowedPartidas && allowedPartidas.size === 0) {
            // Document is not related to any partida — exclude all requirements
            doc.matchedRequirements = []
            console.log(`[analyze] ${doc.filename}: EXCLUDED — no relevant partidas`)
          } else if (allowedPartidas) {
            console.log(`[analyze] ${doc.filename}: classified for partidas: ${[...allowedPartidas].join(', ')} (keeping all ${doc.matchedRequirements.length} reqs)`)
          }
        }
      } else {
        console.warn('[analyze] Classification LLM call failed, proceeding without classification')
      }
    } catch (classErr) {
      console.error('[analyze] Classification failed:', classErr instanceof Error ? classErr.message : classErr)
    }
  }

  // Step 3: Smart routing — use chunk text to determine which reqs are relevant for each doc
  if (documents.some(d => d.matchedRequirements.length > 10)) {
    console.log('[analyze] Starting routing optimization...')
    try {
      const hwDocIds = documents.map(d => d.documentId)
      console.log(`[analyze] Querying chunks for ${hwDocIds.length} documents...`)
      const { data: chunks, error: chunksError } = await supabaseAdmin
        .from('document_chunks')
        .select('id, document_id, chunk_text')
        .in('document_id', hwDocIds)

      console.log(`[analyze] Chunks query result: ${chunks?.length ?? 0} chunks, error: ${chunksError?.message ?? 'none'}`)

      if (chunks && chunks.length > 0) {
        const MIN_REQS_PER_DOC = 20

        for (const doc of documents) {
          const docChunks = chunks.filter(c => c.document_id === doc.documentId)
          if (docChunks.length === 0) {
            console.log(`[analyze] ${doc.filename}: no chunks, keeping all ${doc.matchedRequirements.length} reqs`)
            continue
          }

          const docText = docChunks.map(c => c.chunk_text).join(' ').toLowerCase()
          const allReqs = doc.matchedRequirements

          // Score each requirement by keyword overlap
          const scored = allReqs.map((req, idx) => {
            const words = req.text.toLowerCase().split(/\s+/).filter(w => w.length >= 4)
            const matchCount = words.filter(w => docText.includes(w)).length
            return { idx, score: words.length > 0 ? matchCount / words.length : 0 }
          })

          scored.sort((a, b) => b.score - a.score)
          const withMatches = scored.filter(s => s.score > 0)
          const selected = withMatches.length >= MIN_REQS_PER_DOC ? withMatches : scored.slice(0, Math.max(MIN_REQS_PER_DOC, withMatches.length))

          doc.matchedRequirements = selected.map(s => allReqs[s.idx])
          console.log(`[analyze] ${doc.filename}: ${doc.matchedRequirements.length}/${allReqs.length} reqs after routing (${docChunks.length} chunks)`)
        }
        console.log('[analyze] Routing complete.')
      } else {
        console.log('[analyze] FALLBACK: No chunks found, all docs keep all reqs')
      }
    } catch (routeErr) {
      console.error('[analyze] FALLBACK: Routing failed:', routeErr instanceof Error ? routeErr.message : routeErr)
    }
  } else {
    console.log('[analyze] Routing skipped: docs already have <= 10 reqs')
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

      // Load LLM config for this project
      const { data: projectData } = await supabaseAdmin
        .from('projects')
        .select('metadata')
        .eq('id', projectId)
        .single()
      const llmConfig = ((projectData?.metadata ?? {}) as Record<string, unknown>).llmConfig as {
        model?: string; temperature?: number; strictness?: string; maxExactTextLength?: number; maxContextChars?: number
      } | undefined

      const llmModel = llmConfig?.model || 'openai/gpt-4o'
      const llmTemp = llmConfig?.temperature ?? 0

      let strictnessRule = 'If the document clearly provides the capability, mark it as found'
      if (llmConfig?.strictness === 'strict') {
        strictnessRule = 'Only mark as found if there is CLEAR and EXPLICIT evidence. Do NOT guess.'
      } else if (llmConfig?.strictness === 'permissive') {
        strictnessRule = 'Mark as found if there is any reasonable indication of compliance. When in doubt, mark as found.'
      }

      console.log(`[analyze] LLM Config: model=${llmModel}, temp=${llmTemp}, strictness=${llmConfig?.strictness ?? 'balanced'}, rule="${strictnessRule}"`)

      const systemPrompt = `You are a technical compliance analyst specializing in Peruvian public procurement (licitaciones).
You verify whether a vendor's technical datasheet satisfies requirements from an ETT (Especificacion Tecnica de Terminos).

CONTEXT:
- Requirements are extracted from ETT documents in Spanish
- Vendor documents may be in Spanish or English (datasheets, spec sheets, certifications)
- This is for a public infrastructure project (hospitals, schools, etc.)
- Documents are typically structured as tables, bullet lists, or spec sheets

MATCHING RULES:
- Look for FUNCTIONAL EQUIVALENCE, not just exact text matches
- "Puerto Ethernet 10/100/1000" matches "RJ-45 10/100/1000 Mbps Ethernet"
- "Debe soportar 600 LBS" matches "Holding force: 600 lbs (2700N)"
- "Certificacion UL o similar" matches "CE, FCC, CB, UL294" or similar certifications
- Technical specs often use abbreviations, different units, or alternate terminology
- ${strictnessRule}

EVIDENCE RULES (CRITICAL):
- exactText must be the SPECIFIC cell value, bullet point, or single spec line that proves compliance
- Copy the text VERBATIM from the document - do NOT paraphrase or combine multiple lines
- GOOD examples of exactText:
  * "Power supply can be 12VDC or 24VDC"
  * "Supports TCP/IP, RS-485, Wiegand (W26/W34)"
  * "Working temperature -20°C to +65°C (-4°F to 149°F)"
  * "CE, FCC, CB, UL294"
  * "1 RJ-45 10/100 Mbps self-adaptive"
- BAD examples (too long, paraphrased):
  * "The controller supports multiple protocols including TCP/IP and RS-485 for communication with card readers and other devices"
  * "Power supply 100 ~ 240 VAC with backup battery design"
- Maximum 80 characters for exactText
- Include the page number where evidence was found
- If you cannot find clear evidence, set found to false

Respond in JSON ONLY:
{"annotations":[{"requirementId":"REQ-001","found":true,"pageNum":2,"exactText":"Power supply can be 12VDC or 24VDC","confidence":0.85}]}`

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
            model: llmModel,
            temperature: llmTemp,
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
      // Calculate total unique requirements evaluated across all docs
      const allReqIds = new Set<string>()
      for (const doc of results) {
        for (const ann of doc.annotations) {
          allReqIds.add(ann.requirementId)
        }
      }
      // Use the actual ETT total (not just what ended up in annotations)
      const totalRequirements = ettTotalRequirements > 0 ? ettTotalRequirements : allReqIds.size

      // Collect unfound requirements (unique by requirementId)
      const foundReqIds = new Set<string>()
      for (const doc of results) {
        for (const ann of doc.annotations) {
          if (ann.found) foundReqIds.add(ann.requirementId)
        }
      }

      // Build unfound list from ALL ETT requirements, not just annotated ones
      const unfoundRequirements = ettAllRequirements.length > 0
        ? ettAllRequirements
            .filter(req => !foundReqIds.has(req.requirementId))
            .map(req => ({
              requirementId: req.requirementId,
              text: req.text,
              partida: req.partida,
              partidaDesc: req.partidaDesc,
            }))
        : Array.from(allReqIds)
            .filter(id => !foundReqIds.has(id))
            .map(id => {
              for (const doc of results) {
                const ann = doc.annotations.find(a => a.requirementId === id)
                if (ann) {
                  return {
                    requirementId: id,
                    text: ann.requirementText || '',
                    partida: ann.partida || '',
                    partidaDesc: ann.partidaDesc || '',
                  }
                }
              }
              return { requirementId: id, text: '', partida: '', partidaDesc: '' }
            })

      await supabaseAdmin.from('analysis_results').update({
        status: 'completed',
        zip_file_url: zipFileUrl,
        analysis_metadata: {
          documentCount: responseData.totalDocuments,
          totalAnnotations: responseData.totalAnnotations,
          totalRequirements,
          unfoundRequirements,
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
// LLM-based ETT requirement extraction
// ---------------------------------------------------------------------------

async function extractRequirementsWithLLM(
  ettText: string,
  model: string,
  apiKey: string,
): Promise<Array<{ text: string; partida: string; partidaDesc: string }>> {
  // Truncate if text is very long (avoid token limits)
  const maxChars = 30000
  const textToSend = ettText.length > maxChars ? ettText.substring(0, maxChars) : ettText

  const systemPrompt = `You are an expert in Peruvian public procurement documents (ETT - Especificación Técnica de Términos / Especificaciones Técnicas).

Your task: Extract ALL technical requirements from the ETT document text.

WHAT IS A REQUIREMENT:
- Any technical specification that a vendor/product must satisfy
- Hardware specs: processor, memory, storage, ports, voltage, temperature, certifications
- Software specs: licenses, protocols, compatibility, features
- Performance specs: speed, capacity, resolution, weight
- Compliance: certifications (UL, CE, FCC), standards (IP65, NFPA), norms

WHAT IS NOT A REQUIREMENT:
- Administrative text (project name, dates, general descriptions)
- Table headers or section titles (unless they contain a spec)
- Page numbers, footers, headers
- General statements without a measurable spec

GROUPING BY PARTIDA:
- If the document has numbered sections (like 06.11.01.01, 2.3.1, Item 1, etc.), use those as "partida"
- Group requirements under their respective section/partida
- If no clear sections exist, use descriptive categories (e.g., "IMPRESORA", "LAPTOP", "MONITOR")

OUTPUT FORMAT (JSON only):
{"requirements":[{"text":"Procesador Intel Core i5 de 13va generación o superior","partida":"2.1","partidaDesc":"LAPTOP"},{"text":"Memoria RAM 16GB DDR5","partida":"2.1","partidaDesc":"LAPTOP"}]}

RULES:
- Extract EVERY technical requirement, even if it seems minor
- Keep the original Spanish text exactly as written
- Each requirement should be a single spec (split combined lines)
- Typical ETTs have 20-100+ requirements depending on complexity
- Do NOT skip requirements just because they repeat across sections`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract all technical requirements from this ETT document:\n\n${textToSend}` },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`LLM extraction failed: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()
  const content = result.choices[0].message.content

  let parsed: { requirements?: Array<{ text: string; partida: string; partidaDesc: string }> }
  try {
    parsed = JSON.parse(content)
  } catch {
    const cleaned = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
    parsed = JSON.parse(cleaned)
  }

  const requirements = parsed.requirements || []

  // Filter out very short entries (< 10 chars) that might be noise
  return requirements.filter(r => r.text && r.text.length >= 10)
}


// ---------------------------------------------------------------------------
// Inline ETT requirement extraction (regex-based fallback)
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

const ETT_PARTIDA = /^(\d{1,2}(?:\.\d{1,4}){1,4})\.?\s+(.+)/

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
      inTargetSection = true
      currentPartida = partidaMatch[1]
      currentPartidaDesc = partidaMatch[2].trim()
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
  
  // Fallback: if no requirements were extracted (no partida patterns found),
  // try extracting ALL spec-like lines without requiring a partida header
  if (requirements.length === 0 && lines.length > 5) {
    console.log(`[extractETTRequirements] Fallback: no partida patterns found, extracting all spec lines`)
    let fallbackCounter = 0
    let fallbackLines: string[] = []

    function flushFallback() {
      if (fallbackLines.length === 0) return
      const text = fallbackLines.join('\n').trim()
      if (text.length < 15) { fallbackLines = []; return }
      fallbackCounter++
      requirements.push({
        requirementId: `REQ-${String(fallbackCounter).padStart(3, '0')}`,
        text,
        partida: 'GENERAL',
        partidaDesc: 'Especificaciones Técnicas',
      })
      fallbackLines = []
    }

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (ETT_NOISE.some(p => p.test(trimmed))) continue
      // Skip short/header-like lines
      if (/^[A-Z\u00C0-\u00DC]{4,}(\s+[A-Z\u00C0-\u00DC]+)*$/.test(trimmed)) continue
      if (trimmed.length < 15) continue

      // Check if it's a partida header — use as category
      const partidaMatch = trimmed.match(ETT_PARTIDA)
      if (partidaMatch) {
        flushFallback()
        // Update partida for subsequent requirements
        const partida = partidaMatch[1]
        const desc = partidaMatch[2].trim()
        // Update the last requirement's partida or set for next ones
        requirements.forEach(r => { if (r.partida === 'GENERAL') { r.partida = partida; r.partidaDesc = desc } })
        continue
      }

      // Bullet-prefixed lines start new requirement
      if (/^\s*[•\-]\s+|^\s*o\s{2,}|^\s*\d+[.)]\s+/.test(trimmed)) {
        flushFallback()
        const cleaned = trimmed
          .replace(/^\s*[•\-]\s+/, '')
          .replace(/^\s*o\s{2,}/, '')
          .replace(/^\s*\d+[.)]\s+/, '')
        fallbackLines.push(cleaned)
        continue
      }

      // Spec starter patterns start new requirement
      if (SPEC_STARTERS.some(p => p.test(trimmed))) {
        flushFallback()
        fallbackLines.push(trimmed)
        continue
      }

      // Continuation of previous
      if (fallbackLines.length > 0 && trimmed.length < 250) {
        fallbackLines.push(trimmed)
      } else if (trimmed.length >= 20) {
        // New standalone requirement-like line
        flushFallback()
        fallbackLines.push(trimmed)
      }
    }
    flushFallback()
    console.log(`[extractETTRequirements] Fallback extracted ${requirements.length} requirements`)
  }

  return requirements
}

function normalizeETTText(text: string): string {
  let r = text.replace(/--- Page \d+ ---/g, '\n')

  // Split before partida numbers (supports 2.11, 2.11., 06.11.01.01, etc.)
  r = r.replace(/(\s)(\d{1,2}\.\d{1,4}\.\d{1,4}\.\d{1,4}\.?\s)/g, '\n$2')
  r = r.replace(/(\s)(\d{1,2}\.\d{1,4}\.\d{1,4}\.?\s)/g, '\n$2')
  r = r.replace(/(\s)(\d{1,2}\.\d{1,4}\.?\s)/g, '\n$2')

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


// ---------------------------------------------------------------------------
// Cosine similarity for embedding vectors
// ---------------------------------------------------------------------------
