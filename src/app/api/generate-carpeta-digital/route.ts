import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db.server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// Polyfill DOMMatrix for pdfjs-dist in Node.js environment
if (typeof globalThis.DOMMatrix === 'undefined') {
  // @ts-expect-error -- minimal polyfill for pdfjs text extraction
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(init?: number[]) {
      const m = init || [1, 0, 0, 1, 0, 0]
      this.a = m[0]; this.b = m[1]; this.c = m[2]; this.d = m[3]; this.e = m[4]; this.f = m[5]
    }
    a = 1; b = 0; c = 0; d = 0; e = 0; f = 0
    isIdentity = true
    is2D = true
  }
}

export const maxDuration = 300

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
 * POST /api/generate-carpeta-digital
 *
 * Generates the "Carpeta Digital" — a consolidated PDF with:
 * - Index page (partidas + cartas de sustento)
 * - Per-partida title pages + annotated PDFs
 * - Sustento letters at the end
 * - Page numbers on every page (bold, 18px, centered bottom)
 *
 * Also generates an updated compliance matrix Excel with Pág/Pto references.
 *
 * Body: { analysisId: string, projectId: string, source?: 'analysis' | 'sustento' }
 */
export async function POST(request: NextRequest) {
  console.log('[carpeta-digital] === POST HANDLER CALLED ===')
  const body = await request.json()
  const { analysisId, projectId, source = 'analysis' } = body as { analysisId: string; projectId: string; source?: 'analysis' | 'sustento' }

  if (!analysisId || !projectId) {
    return NextResponse.json({ error: 'Missing analysisId or projectId' }, { status: 400 })
  }

  // 1. Get analysis results
  const { data: analysis, error: analysisError } = await supabaseAdmin
    .from('analysis_results')
    .select('*')
    .eq('id', analysisId)
    .single()

  if (analysisError || !analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
  }

  if (analysis.status !== 'completed') {
    return NextResponse.json({ error: 'Analysis not completed yet' }, { status: 400 })
  }

  const metadata = analysis.analysis_metadata as {
    processedDocuments?: ProcessedDocument[]
    totalRequirements?: number
    unfoundRequirements?: Array<{ requirementId: string; text: string; partida: string; partidaDesc: string }>
  }

  const processedDocs = metadata?.processedDocuments ?? []
  if (processedDocs.length === 0) {
    return NextResponse.json({ error: 'No processed documents in analysis' }, { status: 400 })
  }

  // 2. Get project info
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()
  const projectName = project?.name ?? 'Analysis'

  // 3. Get sustento documents linked to requirements via sustento_links
  const { data: sustentoLinkRows } = await supabaseAdmin
    .from('sustento_links')
    .select('document_id')
    .eq('project_id', projectId)

  const sustentoDocIds = [...new Set((sustentoLinkRows ?? []).map(r => r.document_id))]
  let sustentoDocuments: Array<{ id: string; filename: string; original_file_url: string }> = []
  if (sustentoDocIds.length > 0) {
    const { data: sustentoDocs } = await supabaseAdmin
      .from('documents')
      .select('id, filename, original_file_url')
      .in('id', sustentoDocIds)
    sustentoDocuments = sustentoDocs ?? []
  }

  console.log(`[carpeta-digital] Project: ${projectName}, Docs: ${processedDocs.length}, Sustento: ${sustentoDocuments.length}`)

  // 4. Group annotations by partida
  // Each partida has multiple docs that contribute annotations
  const partidaMap = new Map<string, {
    partidaDesc: string
    annotations: Array<AnnotationResult & { docFilename: string; docUrl: string; documentId: string }>
  }>()

  for (const doc of processedDocs) {
    for (const ann of doc.annotations) {
      if (!ann.found || !ann.partida) continue
      if (!partidaMap.has(ann.partida)) {
        partidaMap.set(ann.partida, { partidaDesc: ann.partidaDesc || '', annotations: [] })
      }
      partidaMap.get(ann.partida)!.annotations.push({
        ...ann,
        docFilename: doc.filename,
        docUrl: doc.originalFileUrl || '',
        documentId: doc.documentId,
      })
    }
  }

  // Sort partidas
  const sortedPartidas = Array.from(partidaMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  console.log(`[carpeta-digital] Partidas with annotations: ${sortedPartidas.length}`)

  // 5. Build the consolidated PDF
  const finalPdf = await PDFDocument.create()
  const font = await finalPdf.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await finalPdf.embedFont(StandardFonts.Helvetica)

  // Track page assignments for the compliance matrix
  // Map: requirementId -> { page: number, point: number }
  const pagePointMap = new Map<string, { page: number; point: number }>()

  // Helper: add a title page (white page with centered text, word-wrapped)
  function addTitlePage(text: string, fontSize: number = 20) {
    const page = finalPdf.addPage([612, 792]) // Letter size
    const maxWidth = 500 // max text width before wrapping
    const words = text.split(/\s+/)
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = font.widthOfTextAtSize(testLine, fontSize)
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) lines.push(currentLine)

    const lineHeight = fontSize * 1.4
    const totalHeight = lines.length * lineHeight
    const startY = (792 + totalHeight) / 2

    for (let i = 0; i < lines.length; i++) {
      const lineWidth = font.widthOfTextAtSize(lines[i], fontSize)
      const x = (612 - lineWidth) / 2
      page.drawText(lines[i], {
        x: Math.max(30, x),
        y: startY - (i * lineHeight),
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      })
    }
  }

  // Helper: fetch and embed a PDF
  async function embedPdfPages(url: string): Promise<number> {
    try {
      const headers: Record<string, string> = {}
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
      const buffer = await res.arrayBuffer()
      const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
      const pageIndices = srcDoc.getPageIndices()
      const copiedPages = await finalPdf.copyPages(srcDoc, pageIndices)
      for (const page of copiedPages) {
        finalPdf.addPage(page)
      }
      return copiedPages.length
    } catch (err) {
      console.error(`[carpeta-digital] Failed to embed PDF from ${url}:`, err)
      // Add a placeholder page
      const page = finalPdf.addPage([612, 792])
      page.drawText('PDF could not be loaded', { x: 50, y: 400, size: 14, font: fontRegular, color: rgb(0.5, 0, 0) })
      return 1
    }
  }

  // === BUILD PDF ===

  // We'll build the content first, then prepend the index page at the end
  // since we need to know final page numbers

  // Track index entries: { label: string, pageNum: number }
  const indexEntries: Array<{ label: string; pageNum: number }> = []
  let currentPageCount = 1 // Start at 1 (index takes page 1)

  // Process each partida
  for (const [partida, { partidaDesc, annotations }] of sortedPartidas) {
    // Title page for this partida
    currentPageCount++
    const titleLabel = partidaDesc || partida
    indexEntries.push({ label: titleLabel, pageNum: currentPageCount })
    addTitlePage(titleLabel.toUpperCase(), 20)

    // Group annotations by document
    const byDoc = new Map<string, typeof annotations>()
    for (const ann of annotations) {
      if (!byDoc.has(ann.documentId)) byDoc.set(ann.documentId, [])
      byDoc.get(ann.documentId)!.push(ann)
    }

    // Embed each document's pages
    for (const [docId, docAnnotations] of byDoc) {
      const docUrl = docAnnotations[0].docUrl
      if (!docUrl) continue

      const startPage = currentPageCount + 1

      // Fetch and annotate the PDF using exact text coordinates from pdfjs
      try {
        const headers: Record<string, string> = {}
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
        }
        const res = await fetch(docUrl, { headers })
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
        const buffer = await res.arrayBuffer()
        const pdfBuffer = Buffer.from(buffer)

        // Step 1: Try to use pdfjs-dist for text coordinate extraction
        // Falls back to margin labels if pdfjs fails (Node.js worker issues)
        let textPositionsByPage = new Map<number, Array<{ str: string; x: number; y: number; width: number; height: number }>>()
        const neededPages = new Set(docAnnotations.filter(a => a.pageNum).map(a => a.pageNum!))

        try {
          const pdfjsLib = await import('pdfjs-dist')
          if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = ''
          }
          const pdfjsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer), verbosity: 0 }).promise

          for (const pageNum of neededPages) {
            if (pageNum < 1 || pageNum > pdfjsDoc.numPages) continue
            const pjPage = await pdfjsDoc.getPage(pageNum)
            const textContent = await pjPage.getTextContent()
            const items: Array<{ str: string; x: number; y: number; width: number; height: number }> = []
            for (const item of textContent.items) {
              if (!('str' in item) || !item.str.trim()) continue
              const tx = item.transform[4]
              const ty = item.transform[5]
              const fontSize = Math.abs(item.transform[3]) || Math.abs(item.transform[0])
              items.push({ str: item.str, x: tx, y: ty, width: item.width, height: fontSize })
            }
            textPositionsByPage.set(pageNum, items)
          }
          await pdfjsDoc.destroy()
        } catch (pdfjsErr) {
          console.warn(`[carpeta-digital] pdfjs text extraction failed for doc ${docId}, using fallback annotations:`, pdfjsErr instanceof Error ? pdfjsErr.message : pdfjsErr)
          textPositionsByPage = new Map()
        }

        // Step 2: Use pdf-lib to draw annotations at exact positions
        const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
        const boldFontEmbed = await srcDoc.embedFont(StandardFonts.HelveticaBold)

        // Track highlighted text items per page to avoid double-highlighting
        const highlightedItemsByPage = new Map<number, Set<string>>()

        // Group annotations by page for correlative numbering PER PAGE
        const annsByPage = new Map<number, typeof docAnnotations>()
        for (const ann of docAnnotations) {
          if (!ann.pageNum || ann.pageNum > srcDoc.getPageCount()) continue
          if (!annsByPage.has(ann.pageNum)) annsByPage.set(ann.pageNum, [])
          annsByPage.get(ann.pageNum)!.push(ann)
        }

        let globalPointCounter = 0
        for (const [pageNum, pageAnns] of annsByPage) {
          const page = srcDoc.getPage(pageNum - 1)
          const { width: pageWidth } = page.getSize()
          const textItems = textPositionsByPage.get(pageNum) || []
          const highlightedItems = highlightedItemsByPage.get(pageNum) || new Set<string>()
          highlightedItemsByPage.set(pageNum, highlightedItems)

          let pagePointCounter = 0
          for (const ann of pageAnns) {
            globalPointCounter++
            pagePointCounter++

            let annotated = false

            // Try to find exact text position using exactText
            if (ann.exactText && textItems.length > 0) {
              const searchWords = ann.exactText.toLowerCase().split(/\s+/).filter(w => w.length >= 3).slice(0, 10)
              const matches: Array<{ x: number; y: number; width: number; height: number; key: string }> = []

              for (const item of textItems) {
                if (matches.length >= 5) break
                const itemKey = `${item.x},${item.y},${item.str}`
                if (highlightedItems.has(itemKey)) continue // Skip already highlighted
                const itemLower = item.str.toLowerCase()
                const matchCount = searchWords.filter(w => itemLower.includes(w)).length
                if (matchCount >= 1) {
                  matches.push({ ...item, key: itemKey })
                }
              }

              if (matches.length > 0) {
                // Mark items as highlighted
                for (const m of matches) highlightedItems.add(m.key)

                // Calculate bounding box of all matched text items
                const minX = Math.min(...matches.map(m => m.x))
                const minY = Math.min(...matches.map(m => m.y))
                const maxX = Math.max(...matches.map(m => m.x + m.width))
                const maxY = Math.max(...matches.map(m => m.y + m.height))

                const rectX = Math.max(25, minX - 5)
                const rectY = minY - 5
                const rectWidth = Math.min(pageWidth - 50, maxX - minX + 10)
                const rectHeight = maxY - minY + 10

                // Yellow highlight
                page.drawRectangle({
                  x: rectX,
                  y: rectY,
                  width: rectWidth,
                  height: rectHeight,
                  color: rgb(1, 1, 0),
                  opacity: 0.25,
                })
                // Red border (2px)
                page.drawRectangle({
                  x: rectX - 3,
                  y: rectY - 3,
                  width: rectWidth + 6,
                  height: rectHeight + 6,
                  borderColor: rgb(1, 0, 0),
                  borderWidth: 2,
                })
                // Point number on the left margin — at TOP of the rectangle
                page.drawText(String(pagePointCounter), {
                  x: Math.max(8, rectX - 20),
                  y: rectY + rectHeight - 2,
                  size: 12,
                  font: boldFontEmbed,
                  color: rgb(1, 0, 0),
                })

                annotated = true
              }
            }

            // Fallback: draw visible annotation at calculated position
            if (!annotated) {
              const { height: pgHeight } = page.getSize()
              // Position from the top, staggered per annotation on this page
              const fallbackY = pgHeight - 80 - ((pagePointCounter - 1) * 50)
              if (fallbackY > 50) {
                const rectX = 50
                const rectWidth = pageWidth - 100
                const rectHeight = 35

                // Yellow highlight background
                page.drawRectangle({
                  x: rectX,
                  y: fallbackY - 5,
                  width: rectWidth,
                  height: rectHeight,
                  color: rgb(1, 1, 0),
                  opacity: 0.2,
                })
                // Red border (2px)
                page.drawRectangle({
                  x: rectX - 3,
                  y: fallbackY - 8,
                  width: rectWidth + 6,
                  height: rectHeight + 6,
                  borderColor: rgb(1, 0, 0),
                  borderWidth: 2,
                })
                // Point number at top-left
                page.drawText(String(pagePointCounter), {
                  x: rectX - 18,
                  y: fallbackY + rectHeight - 12,
                  size: 12,
                  font: boldFontEmbed,
                  color: rgb(1, 0, 0),
                })
                // REQ label inside the rectangle
                page.drawText(ann.requirementId, {
                  x: rectX + 5,
                  y: fallbackY + 5,
                  size: 8,
                  font: boldFontEmbed,
                  color: rgb(0.5, 0, 0),
                })
              }
            }

            // Record page/point for compliance matrix (uses page-relative counter)
            const absolutePage = startPage + (pageNum - 1)
            pagePointMap.set(ann.requirementId, { page: absolutePage, point: pagePointCounter })
          }
        }

        // Copy annotated pages to final PDF
        const pageIndices = srcDoc.getPageIndices()
        const copiedPages = await finalPdf.copyPages(srcDoc, pageIndices)
        for (const page of copiedPages) {
          finalPdf.addPage(page)
        }
        currentPageCount += copiedPages.length
      } catch (err) {
        console.error(`[carpeta-digital] Error processing doc ${docId}:`, err)
        const page = finalPdf.addPage([612, 792])
        page.drawText('PDF could not be loaded', { x: 50, y: 400, size: 14, font: fontRegular, color: rgb(0.5, 0, 0) })
        currentPageCount++
      }
    }
  }

  // Add sustento section — with annotations for linked requirements
  if (sustentoDocuments.length > 0) {
    // Load sustento links to know which requirements are in each document
    const { data: sustentoLinksData } = await supabaseAdmin
      .from('sustento_links')
      .select('document_id, requirement_ids')
      .eq('project_id', projectId)

    const reqTextMap = new Map<string, string>()
    // Build a map of requirementId -> text from the analysis metadata
    if (metadata?.unfoundRequirements) {
      for (const req of metadata.unfoundRequirements) {
        reqTextMap.set(req.requirementId, req.text)
      }
    }

    currentPageCount++
    indexEntries.push({ label: 'CARTA DE SUSTENTO', pageNum: currentPageCount })
    addTitlePage('CARTA DE SUSTENTO', 20)

    for (const doc of sustentoDocuments) {
      if (!doc.original_file_url) continue

      // Get requirements linked to this sustento document
      const docLink = (sustentoLinksData ?? []).find(l => l.document_id === doc.id)
      const linkedReqIds = docLink?.requirement_ids ?? []

      const startPage = currentPageCount + 1

      try {
        const headers: Record<string, string> = {}
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
        }
        const res = await fetch(doc.original_file_url, { headers })
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
        const buffer = await res.arrayBuffer()
        const pdfBuffer = Buffer.from(buffer)

        // Try pdfjs for text coordinates
        let textPositionsByPage = new Map<number, Array<{ str: string; x: number; y: number; width: number; height: number }>>()
        try {
          const pdfjsLib = await import('pdfjs-dist')
          if (pdfjsLib.GlobalWorkerOptions) pdfjsLib.GlobalWorkerOptions.workerSrc = ''
          const pdfjsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer), verbosity: 0 }).promise
          for (let p = 1; p <= pdfjsDoc.numPages; p++) {
            const page = await pdfjsDoc.getPage(p)
            const textContent = await page.getTextContent()
            const items: Array<{ str: string; x: number; y: number; width: number; height: number }> = []
            for (const item of textContent.items) {
              if (!('str' in item) || !item.str.trim()) continue
              items.push({ str: item.str, x: item.transform[4], y: item.transform[5], width: item.width, height: Math.abs(item.transform[3]) || Math.abs(item.transform[0]) })
            }
            textPositionsByPage.set(p, items)
          }
          await pdfjsDoc.destroy()
        } catch {
          textPositionsByPage = new Map()
        }

        // Load and annotate the PDF
        const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
        const boldFontEmbed = await srcDoc.embedFont(StandardFonts.HelveticaBold)
        const highlightedItems = new Set<string>()

        // First pass: find which page each requirement matches on
        const reqPageMap = new Map<string, { pageIdx: number; matches: Array<{ x: number; y: number; width: number; height: number; key: string }> }>()

        for (const reqId of linkedReqIds) {
          const reqText = reqTextMap.get(reqId) || ''
          if (!reqText) continue

          const searchWords = reqText.toLowerCase().split(/\s+/).filter(w => w.length >= 3).slice(0, 10)

          for (let pageIdx = 0; pageIdx < srcDoc.getPageCount(); pageIdx++) {
            const pageNum = pageIdx + 1
            const textItems = textPositionsByPage.get(pageNum) || []

            const matches: Array<{ x: number; y: number; width: number; height: number; key: string }> = []
            for (const item of textItems) {
              if (matches.length >= 5) break
              const itemKey = `${item.x},${item.y},${item.str}`
              if (highlightedItems.has(itemKey)) continue
              const itemLower = item.str.toLowerCase()
              const matchCount = searchWords.filter(w => itemLower.includes(w)).length
              if (matchCount >= 1) {
                matches.push({ ...item, key: itemKey })
              }
            }

            if (matches.length > 0) {
              for (const m of matches) highlightedItems.add(m.key)
              reqPageMap.set(reqId, { pageIdx, matches })
              break
            }
          }
        }

        // Second pass: draw annotations with page-relative numbering
        const pagePointCounters = new Map<number, number>()

        for (const reqId of linkedReqIds) {
          const entry = reqPageMap.get(reqId)
          if (!entry) {
            // Fallback for reqs not found
            const page = srcDoc.getPage(0)
            const { width: pageWidth, height: pgHeight } = page.getSize()
            const fallbackCounter = (pagePointCounters.get(0) ?? 0) + 1
            pagePointCounters.set(0, fallbackCounter)
            const fallbackY = pgHeight - 60 - ((fallbackCounter - 1) * 50)
            if (fallbackY > 50) {
              page.drawRectangle({ x: 50, y: fallbackY - 5, width: pageWidth - 100, height: 35, color: rgb(1, 1, 0), opacity: 0.2 })
              page.drawRectangle({ x: 47, y: fallbackY - 8, width: pageWidth - 94, height: 41, borderColor: rgb(1, 0, 0), borderWidth: 2 })
              page.drawText(String(fallbackCounter), { x: 30, y: fallbackY + 20, size: 12, font: boldFontEmbed, color: rgb(1, 0, 0) })
              page.drawText(reqId, { x: 55, y: fallbackY + 5, size: 8, font: boldFontEmbed, color: rgb(0.5, 0, 0) })
            }
            const absolutePage = startPage
            pagePointMap.set(reqId, { page: absolutePage, point: fallbackCounter })
            continue
          }

          const { pageIdx, matches } = entry
          const pageCounter = (pagePointCounters.get(pageIdx) ?? 0) + 1
          pagePointCounters.set(pageIdx, pageCounter)

          const page = srcDoc.getPage(pageIdx)
          const { width: pageWidth } = page.getSize()
          const minX = Math.min(...matches.map(m => m.x))
          const minY = Math.min(...matches.map(m => m.y))
          const maxX = Math.max(...matches.map(m => m.x + m.width))
          const maxY = Math.max(...matches.map(m => m.y + m.height))
          const rectX = Math.max(25, minX - 5)
          const rectY = minY - 5
          const rectWidth = Math.min(pageWidth - 50, maxX - minX + 10)
          const rectHeight = maxY - minY + 10

          page.drawRectangle({ x: rectX, y: rectY, width: rectWidth, height: rectHeight, color: rgb(1, 1, 0), opacity: 0.25 })
          page.drawRectangle({ x: rectX - 3, y: rectY - 3, width: rectWidth + 6, height: rectHeight + 6, borderColor: rgb(1, 0, 0), borderWidth: 2 })
          page.drawText(String(pageCounter), { x: Math.max(8, rectX - 20), y: rectY + rectHeight - 2, size: 12, font: boldFontEmbed, color: rgb(1, 0, 0) })

          const absolutePage = startPage + pageIdx
          pagePointMap.set(reqId, { page: absolutePage, point: pageCounter })
        }

        // Copy annotated sustento pages to final PDF
        const pageIndices = srcDoc.getPageIndices()
        const copiedPages = await finalPdf.copyPages(srcDoc, pageIndices)
        for (const page of copiedPages) {
          finalPdf.addPage(page)
        }
        currentPageCount += copiedPages.length
      } catch (err) {
        console.error(`[carpeta-digital] Error processing sustento doc ${doc.id}:`, err)
        const added = await embedPdfPages(doc.original_file_url)
        currentPageCount += added
      }
    }
  }

  // Now create the index page and insert it at position 0
  const indexPage = finalPdf.insertPage(0, [612, 792])
  indexPage.drawText('ÍNDICE', { x: 250, y: 720, size: 22, font, color: rgb(0, 0, 0) })

  let yPos = 680
  const INDEX_MAX_WIDTH = 480
  const INDEX_FONT_SIZE = 14
  const INDEX_LINE_HEIGHT = 18

  indexEntries.forEach((entry, idx) => {
    const prefix = `${idx + 1}- `
    const fullText = prefix + entry.label
    
    // Word-wrap for the index
    const words = fullText.split(/\s+/)
    const lines: string[] = []
    let currentLine = ''
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = font.widthOfTextAtSize(testLine, INDEX_FONT_SIZE)
      if (testWidth > INDEX_MAX_WIDTH && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) lines.push(currentLine)

    for (const line of lines) {
      if (yPos < 50) break
      indexPage.drawText(line, { x: 60, y: yPos, size: INDEX_FONT_SIZE, font, color: rgb(0, 0, 0) })
      yPos -= INDEX_LINE_HEIGHT
    }
    yPos -= 8 // Extra spacing between entries
  })

  // Add page numbers to ALL pages
  const totalPages = finalPdf.getPageCount()
  for (let i = 0; i < totalPages; i++) {
    const page = finalPdf.getPage(i)
    const { width } = page.getSize()
    const pageNumStr = String(i + 1).padStart(4, '0')
    const textWidth = font.widthOfTextAtSize(pageNumStr, 14)
    page.drawText(pageNumStr, {
      x: (width - textWidth) / 2,
      y: 25,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    })
  }

  // 6. Save the PDF
  const pdfBytes = await finalPdf.save()
  console.log(`[carpeta-digital] PDF generated: ${totalPages} pages, ${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB`)

  // 7. Generate compliance matrix Excel — same format as results ZIP but with Ítem=reqId and Página=Pág/Pto
  const ExcelJS = (await import('exceljs')).default
  const path = require('path')
  const fs = require('fs')

  // Load template
  const templatePath = path.resolve(process.cwd(), 'docs', 'Compliance_Matrix_Template.xlsx')
  const templateWb = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let templateSheet: any = null
  try {
    if (fs.existsSync(templatePath)) {
      await templateWb.xlsx.readFile(templatePath)
      templateSheet = templateWb.worksheets[0]
    }
  } catch (err) {
    console.warn('[carpeta-digital] Failed to read template:', err)
  }

  const workbook = new ExcelJS.Workbook()

  // Collect all annotations with doc filenames
  const allAnnotations: Array<AnnotationResult & { docFilename: string }> = []
  for (const doc of processedDocs) {
    for (const ann of doc.annotations) {
      allAnnotations.push({ ...ann, docFilename: doc.filename })
    }
  }

  // Group by partida (same logic as generate-results)
  const excelPartidaMap = new Map<string, {
    partidaCode: string
    partidaDesc: string
    requirements: Array<{
      requirementId: string
      requirementText: string
      results: Array<{ docFilename: string; found: boolean; exactText: string | null; pageNum: number | null }>
    }>
  }>()

  for (const ann of allAnnotations) {
    const code = ann.partida || 'unknown'
    const desc = ann.partidaDesc || ''
    if (!excelPartidaMap.has(code)) {
      excelPartidaMap.set(code, { partidaCode: code, partidaDesc: desc, requirements: [] })
    }
    const partida = excelPartidaMap.get(code)!
    let reqEntry = partida.requirements.find(r => r.requirementId === ann.requirementId)
    if (!reqEntry) {
      reqEntry = { requirementId: ann.requirementId, requirementText: ann.requirementText || '', results: [] }
      partida.requirements.push(reqEntry)
    }
    reqEntry.results.push({ docFilename: ann.docFilename, found: ann.found, exactText: ann.exactText, pageNum: ann.pageNum })
  }

  function cleanText(text: string | null | undefined): string {
    if (!text) return ''
    return text.replace(/\n/g, ' ').replace(/\r/g, '').replace(/\s+/g, ' ').trim()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function copyTemplateToSheet(ws: any) {
    if (!templateSheet) return
    for (let c = 1; c <= 6; c++) {
      const templateCol = templateSheet.getColumn(c)
      if (templateCol.width) ws.getColumn(c).width = templateCol.width
    }
    for (let r = 1; r <= 3; r++) {
      const srcRow = templateSheet.getRow(r)
      const destRow = ws.getRow(r)
      destRow.height = srcRow.height
      srcRow.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
        if (colNumber > 6) return
        const destCell = destRow.getCell(colNumber)
        destCell.style = JSON.parse(JSON.stringify(cell.style))
        if (r === 3) destCell.value = cell.value
      })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyDataRowStyle(ws: any, rowNum: number) {
    if (!templateSheet) return
    const srcRow = templateSheet.getRow(4)
    const destRow = ws.getRow(rowNum)
    srcRow.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
      if (colNumber > 6) return
      const destCell = destRow.getCell(colNumber)
      destCell.style = JSON.parse(JSON.stringify(cell.style))
    })
  }

  // Create one sheet per partida
  for (const [code, partida] of excelPartidaMap) {
    if (code === 'unknown') continue
    const sheetName = code.substring(0, 31)
    const ws = workbook.addWorksheet(sheetName)
    copyTemplateToSheet(ws)

    const matchedDocs = new Set<string>()
    for (const req of partida.requirements) {
      for (const r of req.results) {
        if (r.found) matchedDocs.add(r.docFilename)
      }
    }
    const docsStr = [...matchedDocs].map(f => f.replace(/\.pdf$/i, '')).join(' / ')

    try { ws.mergeCells('B1:C1') } catch { /* */ }
    try { ws.mergeCells('D1:F1') } catch { /* */ }
    try { ws.mergeCells('B2:C2') } catch { /* */ }
    try { ws.mergeCells('D2:F2') } catch { /* */ }
    ws.getCell('B1').value = `PARTIDAS: ${code}`
    ws.getCell('D1').value = `Marca: ${docsStr ? docsStr.split('/')[0]?.trim() : ''}`
    ws.getCell('B2').value = `DESCRIPCION: ${cleanText(partida.partidaDesc)}`
    ws.getCell('D2').value = `Modelo: ${docsStr}`

    // Sort requirements by ID (numeric) within each partida
    partida.requirements.sort((a, b) => {
      const numA = parseInt(a.requirementId.replace(/\D/g, ''), 10)
      const numB = parseInt(b.requirementId.replace(/\D/g, ''), 10)
      return numA - numB
    })

    partida.requirements.forEach((req, idx) => {
      const rowNum = idx + 4
      applyDataRowStyle(ws, rowNum)
      const row = ws.getRow(rowNum)
      const bestResult = req.results.find(r => r.found) || req.results[0]
      const found = bestResult?.found ?? false
      const pp = pagePointMap.get(req.requirementId)

      row.getCell(2).value = req.requirementId // Ítem = REQ-001
      row.getCell(3).value = cleanText(req.requirementText)
      row.getCell(3).alignment = { wrapText: true, vertical: 'top' }
      row.getCell(4).value = found ? cleanText(bestResult?.exactText) : ''
      row.getCell(4).alignment = { wrapText: true, vertical: 'top' }
      row.getCell(5).value = found ? 'SI' : 'NO'
      // Data validation dropdown for Cumple column
      row.getCell(5).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"SI,NO"'],
      }
      if (found) {
        row.getCell(5).font = { ...row.getCell(5).font, color: { argb: 'FF008000' } }
      } else {
        row.getCell(5).font = { ...row.getCell(5).font, color: { argb: 'FFCC0000' } }
      }
      row.getCell(6).value = pp ? `Pág. ${pp.page} ; Pto ${pp.point}` : ''
    })
  }

  // Summary sheet
  const summary = workbook.addWorksheet('Resumen', { properties: { tabColor: { argb: '4472C4' } } })
  summary.getColumn(1).width = 20
  summary.getColumn(2).width = 50
  summary.getColumn(3).width = 15
  summary.getColumn(4).width = 15
  summary.getRow(1).values = ['Proyecto', projectName]
  summary.getRow(1).font = { bold: true }
  summary.getRow(2).values = ['Fecha', new Date().toLocaleDateString('es-PE')]
  summary.getRow(3).values = ['Documentos', processedDocs.length]
  summary.getRow(4).values = ['Reqs Encontrados', allAnnotations.filter(a => a.found).length]
  summary.getRow(5).values = ['Total Reqs', new Set(allAnnotations.map(a => a.requirementId)).size]
  summary.getRow(7).values = ['Partida', 'Descripcion', 'Cumple', 'Total']
  summary.getRow(7).font = { bold: true }
  let summaryRow = 8
  for (const [code, partida] of excelPartidaMap) {
    if (code === 'unknown') continue
    const found = partida.requirements.filter(r => r.results.some(res => res.found)).length
    summary.getRow(summaryRow).values = [code, cleanText(partida.partidaDesc), `${found}/${partida.requirements.length}`, partida.requirements.length]
    summaryRow++
  }

  const excelBuffer = await workbook.xlsx.writeBuffer()
  console.log(`[carpeta-digital] Excel generated: ${new Set(allAnnotations.map(a => a.requirementId)).size} requirements`)

  // 8. Create ZIP with both files
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const safeName = projectName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim()
  zip.file(`CARPETA DIGITAL - ${safeName}.pdf`, pdfBytes)
  zip.file(`Matriz_Cumplimiento_${safeName}.xlsx`, excelBuffer as unknown as Uint8Array)

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

  // 9. Upload to Vercel Blob
  const { put } = await import('@vercel/blob')
  const blob = await put(
    `carpeta-digital/${analysisId}/${safeName}.zip`,
    zipBuffer,
    {
      access: 'private',
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'application/zip',
    }
  )

  console.log(`[carpeta-digital] ZIP uploaded: ${blob.url}`)

  // Save the carpeta digital URL in analysis_results for persistence
  const updateColumn = source === 'sustento' ? 'sustento_carpeta_digital_url' : 'analysis_carpeta_digital_url'
  await supabaseAdmin
    .from('analysis_results')
    .update({ [updateColumn]: blob.url })
    .eq('id', analysisId)

  return NextResponse.json({ zipUrl: blob.url })
}
