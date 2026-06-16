import 'server-only'

import { PDFDocument, rgb } from 'pdf-lib'
import ExcelJS from 'exceljs'
import { put } from '@vercel/blob'

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

interface GenerateResultsInput {
  processedDocs: ProcessedDocument[]
  analysisId: string
  projectName: string
  blobToken?: string
  onStage?: (message: string) => Promise<void>
}

/**
 * Generates the final deliverables:
 * 1. Annotated PDFs (yellow highlights on evidence text)
 * 2. Compliance Matrix Excel (one tab per document)
 * 3. ZIP package with everything
 *
 * Returns the URL of the uploaded ZIP file.
 */
export async function generateAnalysisResults(input: GenerateResultsInput): Promise<string> {
  const { processedDocs, analysisId, projectName, onStage } = input
  const blobToken = input.blobToken || process.env.BLOB_READ_WRITE_TOKEN || ''
  const log = onStage || (async () => {})

  const zipFiles: Array<{ name: string; buffer: Buffer }> = []

  // 1. Generate annotated PDFs for docs that have found annotations
  for (const doc of processedDocs) {
    const foundAnnotations = doc.annotations.filter(a => a.found)
    if (foundAnnotations.length === 0 || !doc.originalFileUrl) continue

    await log(`Annotating PDF: ${doc.filename} (${foundAnnotations.length} highlights)`)
    console.log(`[generate-results] Annotating PDF: ${doc.filename} (${foundAnnotations.length} highlights)`)
    const annotatedPdf = await annotatePdf(doc.originalFileUrl, doc.annotations, blobToken)
    if (annotatedPdf) {
      zipFiles.push({ name: `annotated/${doc.filename}`, buffer: annotatedPdf })
    }
  }

  // 2. Generate Compliance Matrix Excel
  await log('Generating compliance matrix (Excel)...')
  const excelBuffer = await generateComplianceExcel(processedDocs, projectName)
  zipFiles.push({ name: `Matriz_Cumplimiento_${projectName.replace(/\s+/g, '_')}.xlsx`, buffer: excelBuffer })

  // 3. Create ZIP
  await log(`Creating ZIP package (${zipFiles.length} files)...`)
  const zipBuffer = await createZipBuffer(zipFiles)

  // 4. Upload ZIP to Blob
  await log('Uploading results...')
  const zipFilename = `analysis-results/${analysisId}/Resultados_${projectName.replace(/\s+/g, '_')}.zip`
  const blob = await put(zipFilename, zipBuffer, {
    access: 'private',
    addRandomSuffix: true,
    contentType: 'application/zip',
    token: blobToken,
  })

  return blob.url
}

/**
 * Generates the Compliance Matrix Excel grouped by PARTIDA (ETT section).
 * Each sheet represents a partida (e.g., 06.11.01.01 - Estación de trabajo)
 * and shows only the requirements belonging to that partida with their
 * compliance status across the matched hardware documents.
 * Uses the template styles from Compliance_Matrix_Template.xlsx.
 */
async function generateComplianceExcel(processedDocs: ProcessedDocument[], projectName: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()

  // Style definitions matching the template
  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDADADA' }, bgColor: { argb: 'FFDADADA' } }
  const headerFont: Partial<ExcelJS.Font> = { bold: true, size: 10, color: { argb: 'FF000000' }, name: 'Calibri' }
  const dataFont: Partial<ExcelJS.Font> = { size: 10, color: { argb: 'FF000000' }, name: 'Calibri' }
  const colWidths = [0.89, 5.33, 68.11, 57.89, 7, 22]

  // Collect all annotations from all documents with their partida info
  const allAnnotations: Array<AnnotationResult & { docFilename: string }> = []
  for (const doc of processedDocs) {
    for (const ann of doc.annotations) {
      allAnnotations.push({ ...ann, docFilename: doc.filename })
    }
  }

  // Group annotations by partida
  const partidaMap = new Map<string, {
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

    if (!partidaMap.has(code)) {
      partidaMap.set(code, { partidaCode: code, partidaDesc: desc, requirements: [] })
    }

    const partida = partidaMap.get(code)!
    let reqEntry = partida.requirements.find(r => r.requirementId === ann.requirementId)
    if (!reqEntry) {
      reqEntry = { requirementId: ann.requirementId, requirementText: ann.requirementText || '', results: [] }
      partida.requirements.push(reqEntry)
    }

    reqEntry.results.push({
      docFilename: ann.docFilename,
      found: ann.found,
      exactText: ann.exactText,
      pageNum: ann.pageNum,
    })
  }

  // Helper to clean text (remove newlines, fix encoding)
  function cleanText(text: string | null | undefined): string {
    if (!text) return ''
    return text.replace(/\n/g, ' ').replace(/\r/g, '').replace(/\s+/g, ' ').trim()
  }

  // Create one sheet per partida
  for (const [code, partida] of partidaMap) {
    if (code === 'unknown') continue

    const sheetName = code.substring(0, 31)
    const ws = wb.addWorksheet(sheetName)

    // Column widths from template
    colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w })

    // Determine which documents matched requirements in this partida
    const matchedDocs = new Set<string>()
    for (const req of partida.requirements) {
      for (const r of req.results) {
        if (r.found) matchedDocs.add(r.docFilename)
      }
    }
    const docsStr = [...matchedDocs].map(f => f.replace(/\.pdf$/i, '')).join(' / ')

    // Row 1: PARTIDAS + Marca
    const row1 = ws.getRow(1)
    row1.height = 15.75
    row1.getCell(2).value = `PARTIDAS: ${code}`
    row1.getCell(2).font = headerFont
    row1.getCell(2).fill = headerFill
    row1.getCell(4).value = `Marca:`
    row1.getCell(4).font = headerFont
    row1.getCell(4).fill = headerFill

    // Row 2: DESCRIPCION + Modelo
    const row2 = ws.getRow(2)
    row2.height = 27.6
    row2.getCell(2).value = `DESCRIPCION: ${cleanText(partida.partidaDesc)}`
    row2.getCell(2).font = headerFont
    row2.getCell(2).fill = headerFill
    row2.getCell(4).value = `Modelo: ${docsStr}`
    row2.getCell(4).font = headerFont
    row2.getCell(4).fill = headerFill

    // Row 3: Column headers
    const row3 = ws.getRow(3)
    row3.height = 14.4
    const headers = [null, 'Item', 'Especificaciones tecnicas', 'Especificaciones tecnicas Fichas', 'Cumple', 'Pagina']
    headers.forEach((h, i) => {
      if (h) {
        const cell = row3.getCell(i + 1)
        cell.value = h
        cell.font = headerFont
        cell.fill = headerFill
      }
    })

    // Data rows
    partida.requirements.forEach((req, idx) => {
      const row = ws.getRow(idx + 4)
      const bestResult = req.results.find(r => r.found) || req.results[0]
      const found = bestResult?.found ?? false

      row.getCell(2).value = idx + 1
      row.getCell(2).font = dataFont
      row.getCell(3).value = cleanText(req.requirementText)
      row.getCell(3).font = dataFont
      row.getCell(3).alignment = { wrapText: true, vertical: 'top' }
      row.getCell(4).value = found ? cleanText(bestResult?.exactText) : ''
      row.getCell(4).font = dataFont
      row.getCell(4).alignment = { wrapText: true, vertical: 'top' }
      row.getCell(5).value = found ? 'SI' : 'NO'
      row.getCell(5).font = { ...dataFont, color: { argb: found ? 'FF008000' : 'FFCC0000' }, bold: true }
      row.getCell(6).value = found && bestResult?.pageNum ? `Pag. ${bestResult.pageNum}` : ''
      row.getCell(6).font = dataFont
    })
  }

  // Summary sheet
  const summary = wb.addWorksheet('Resumen', { properties: { tabColor: { argb: '4472C4' } } })
  summary.getColumn(1).width = 60
  summary.getColumn(2).width = 30
  summary.getColumn(3).width = 15
  summary.getColumn(4).width = 15

  summary.getRow(1).values = ['Proyecto', projectName]
  summary.getRow(1).font = { bold: true }
  summary.getRow(2).values = ['Fecha de Generacion', new Date().toLocaleDateString('es-PE')]
  summary.getRow(3).values = ['Total Documentos Analizados', processedDocs.length]
  summary.getRow(4).values = ['Total Requerimientos Encontrados', allAnnotations.filter(a => a.found).length]
  summary.getRow(5).values = ['Total Requerimientos', new Set(allAnnotations.map(a => a.requirementId)).size]

  summary.getRow(7).values = ['Partida', 'Descripcion', 'Cumple', 'Total Reqs']
  summary.getRow(7).font = { bold: true }

  let summaryRow = 8
  for (const [code, partida] of partidaMap) {
    if (code === 'unknown') continue
    const found = partida.requirements.filter(r => r.results.some(res => res.found)).length
    summary.getRow(summaryRow).values = [code, cleanText(partida.partidaDesc), `${found}/${partida.requirements.length}`, partida.requirements.length]
    summaryRow++
  }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * Creates a ZIP buffer from an array of files.
 */
async function createZipBuffer(files: Array<{ name: string; buffer: Buffer }>): Promise<Buffer> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  for (const file of files) {
    zip.file(file.name, file.buffer)
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  return zipBuffer
}

/**
 * Annotates a PDF with yellow highlights on pages where evidence was found.
 * Uses pdfjs-dist to locate text coordinates, then pdf-lib to draw highlights.
 * Returns the annotated PDF as a Buffer, or null if annotation fails.
 */
export async function annotatePdf(
  pdfUrl: string,
  annotations: AnnotationResult[],
  blobToken: string
): Promise<Buffer | null> {
  const foundAnnotations = annotations.filter(a => a.found)
  if (foundAnnotations.length === 0) return null

  try {
    const response = await fetch(pdfUrl, {
      headers: { 'Authorization': `Bearer ${blobToken}` },
    })
    if (!response.ok) return null

    const pdfBytes = await response.arrayBuffer()
    const pdfBuffer = Buffer.from(pdfBytes)

    // Step 1: Use pdfjs-dist to extract text positions
    const pdfjsLib = await import('pdfjs-dist')
    const pdfjsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer), verbosity: 0 }).promise

    // Build text positions map for needed pages
    const textPositionsByPage = new Map<number, Array<{ str: string; x: number; y: number; width: number; height: number }>>()
    const neededPages = new Set(foundAnnotations.map(a => a.pageNum || 1))

    for (const pageNum of neededPages) {
      if (pageNum < 1 || pageNum > pdfjsDoc.numPages) continue
      const page = await pdfjsDoc.getPage(pageNum)
      const textContent = await page.getTextContent()
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

    // Step 2: Use pdf-lib to draw highlights
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()

    // Group annotations by page
    const annotationsByPage = new Map<number, AnnotationResult[]>()
    for (const ann of foundAnnotations) {
      const p = ann.pageNum || 1
      if (!annotationsByPage.has(p)) annotationsByPage.set(p, [])
      annotationsByPage.get(p)!.push(ann)
    }

    for (const [pageNum, pageAnns] of annotationsByPage) {
      const pageIdx = pageNum - 1
      if (pageIdx < 0 || pageIdx >= pages.length) continue

      const page = pages[pageIdx]
      const { width: pageWidth, height: pageHeight } = page.getSize()
      const textItems = textPositionsByPage.get(pageNum) || []

      // Track which text items have already been highlighted (avoid duplicate highlights)
      const highlightedItems = new Set<number>()
      // Track label Y positions to avoid overlapping labels
      let nextLabelY = pageHeight - 20
      const LABEL_SPACING = 14

      pageAnns.forEach((ann) => {
        if (ann.exactText && textItems.length > 0) {
          const words = ann.exactText.toLowerCase().split(/\s+/).filter(w => w.length >= 4).slice(0, 8)
          const matches: Array<{ idx: number; item: typeof textItems[0] }> = []

          for (let i = 0; i < textItems.length && matches.length < 3; i++) {
            if (highlightedItems.has(i)) continue // skip already highlighted
            const t = textItems[i].str.toLowerCase()
            if (words.some(w => t.includes(w))) {
              matches.push({ idx: i, item: textItems[i] })
            }
          }

          if (matches.length > 0) {
            // Draw yellow highlights only on NEW (not already highlighted) items
            for (const { idx, item } of matches) {
              highlightedItems.add(idx)
              page.drawRectangle({
                x: item.x - 1,
                y: item.y - 2,
                width: item.width + 2,
                height: item.height + 4,
                color: rgb(1, 1, 0),
                opacity: 0.3,
              })
            }
            // Green REQ label in right margin, staggered vertically
            page.drawText(ann.requirementId, {
              x: pageWidth - 70,
              y: nextLabelY,
              size: 8,
              color: rgb(0, 0.5, 0),
              opacity: 1,
            })
            nextLabelY -= LABEL_SPACING
            return
          }
        }

        // Fallback: put label in right margin area (staggered)
        page.drawText(ann.requirementId, {
          x: pageWidth - 70,
          y: nextLabelY,
          size: 8,
          color: rgb(0.6, 0.3, 0),
          opacity: 0.8,
        })
        nextLabelY -= LABEL_SPACING
      })
    }

    const annotatedBytes = await pdfDoc.save()
    return Buffer.from(annotatedBytes)
  } catch (err) {
    console.error('[annotatePdf] Error:', err)
    return null
  }
}
