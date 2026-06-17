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
 * Reads the template from docs/Compliance_Matrix_Template.xlsx, duplicates
 * its structure (styles, merges, column widths) for each partida sheet,
 * then fills in the data.
 */
async function generateComplianceExcel(processedDocs: ProcessedDocument[], projectName: string): Promise<Buffer> {
  const path = require('path')
  const fs = require('fs')

  // Load template
  const templatePath = path.resolve(process.cwd(), 'docs', 'Compliance_Matrix_Template.xlsx')
  const templateWb = new ExcelJS.Workbook()
  let templateSheet: ExcelJS.Worksheet | null = null

  try {
    if (fs.existsSync(templatePath)) {
      await templateWb.xlsx.readFile(templatePath)
      templateSheet = templateWb.worksheets[0]
    }
  } catch (err) {
    console.warn('[generate-results] Failed to read template:', err)
  }

  const wb = new ExcelJS.Workbook()

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

  // Helper to clean text
  function cleanText(text: string | null | undefined): string {
    if (!text) return ''
    return text.replace(/\n/g, ' ').replace(/\r/g, '').replace(/\s+/g, ' ').trim()
  }

  // Helper to copy template structure to a new sheet
  function copyTemplateToSheet(ws: ExcelJS.Worksheet) {
    if (!templateSheet) return

    // Copy column widths
    for (let c = 1; c <= 6; c++) {
      const templateCol = templateSheet.getColumn(c)
      if (templateCol.width) ws.getColumn(c).width = templateCol.width
    }

    // Copy first 3 rows (headers) with full styles
    for (let r = 1; r <= 3; r++) {
      const srcRow = templateSheet.getRow(r)
      const destRow = ws.getRow(r)
      destRow.height = srcRow.height
      srcRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber > 6) return
        const destCell = destRow.getCell(colNumber)
        destCell.style = JSON.parse(JSON.stringify(cell.style))
        // Keep value only for row 3 (column headers)
        if (r === 3) destCell.value = cell.value
      })
    }

    // Copy merged cells from template (rows 1-3)
    const merges = (templateSheet as unknown as { _merges: Record<string, unknown> })._merges || {}
    for (const mergeRef of Object.keys(merges)) {
      try {
        const rowNum = parseInt(mergeRef.replace(/[A-Z]/g, ''))
        if (rowNum <= 3) {
          ws.mergeCells(mergeRef)
        }
      } catch { /* skip */ }
    }
  }

  // Helper to copy data row style from template row 4
  function applyDataRowStyle(ws: ExcelJS.Worksheet, rowNum: number) {
    if (!templateSheet) return
    const srcRow = templateSheet.getRow(4)
    const destRow = ws.getRow(rowNum)
    srcRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > 6) return
      const destCell = destRow.getCell(colNumber)
      destCell.style = JSON.parse(JSON.stringify(cell.style))
    })
  }

  // Create one sheet per partida
  for (const [code, partida] of partidaMap) {
    if (code === 'unknown') continue

    const sheetName = code.substring(0, 31)
    const ws = wb.addWorksheet(sheetName)

    // Copy template structure
    copyTemplateToSheet(ws)

    // Determine matched documents
    const matchedDocs = new Set<string>()
    for (const req of partida.requirements) {
      for (const r of req.results) {
        if (r.found) matchedDocs.add(r.docFilename)
      }
    }
    const docsStr = [...matchedDocs].map(f => f.replace(/\.pdf$/i, '')).join(' / ')

    // Fill header data (row 1 & 2)
    ws.getCell('B1').value = `PARTIDAS: ${code}`
    ws.getCell('D1').value = `Marca:`
    ws.getCell('B2').value = `DESCRIPCION: ${cleanText(partida.partidaDesc)}`
    ws.getCell('D2').value = `Modelo: ${docsStr}`

    // Fill data rows
    partida.requirements.forEach((req, idx) => {
      const rowNum = idx + 4
      applyDataRowStyle(ws, rowNum)
      const row = ws.getRow(rowNum)

      const bestResult = req.results.find(r => r.found) || req.results[0]
      const found = bestResult?.found ?? false

      row.getCell(2).value = idx + 1
      row.getCell(3).value = cleanText(req.requirementText)
      row.getCell(3).alignment = { wrapText: true, vertical: 'top' }
      row.getCell(4).value = found ? cleanText(bestResult?.exactText) : ''
      row.getCell(4).alignment = { wrapText: true, vertical: 'top' }
      row.getCell(5).value = found ? 'SI' : 'NO'
      if (found) {
        row.getCell(5).font = { ...row.getCell(5).font, color: { argb: 'FF008000' } }
      } else {
        row.getCell(5).font = { ...row.getCell(5).font, color: { argb: 'FFCC0000' } }
      }
      row.getCell(6).value = found && bestResult?.pageNum ? `Pag. ${bestResult.pageNum}` : ''
    })
  }

  // Summary sheet
  const summary = wb.addWorksheet('Resumen', { properties: { tabColor: { argb: '4472C4' } } })
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
