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
    const foundAnnotations = doc.annotations.filter(a => a.found && a.pageNum)
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
 * Generates the Compliance Matrix Excel by cloning the template sheet for each document.
 * Preserves all formatting, styles, and merged cells from the original template.
 */
async function generateComplianceExcel(processedDocs: ProcessedDocument[], projectName: string): Promise<Buffer> {
  const path = require('path')
  const fs = require('fs')

  const templatePath = path.resolve(process.cwd(), 'docs', 'Compliance_Matrix_Template.xlsx')
  const wb = new ExcelJS.Workbook()

  // Try to load template, fallback to creating from scratch
  let templateSheet: ExcelJS.Worksheet | null = null
  try {
    if (fs.existsSync(templatePath)) {
      await wb.xlsx.readFile(templatePath)
      templateSheet = wb.worksheets[0]
    }
  } catch (err) {
    console.warn('[generate-results] Failed to read template, creating from scratch:', err)
  }

  // If no template, create a basic workbook
  if (!templateSheet) {
    const ws = wb.addWorksheet('Template')
    ws.getRow(1).values = [null, 'PARTIDAS:', null, 'Marca:']
    ws.getRow(2).values = [null, 'DESCRIPCION:', null, 'Modelo:']
    ws.getRow(3).values = [null, 'Item', 'Especificaciones tecnicas', 'Especificaciones tecnicas Fichas', 'Cumple', 'Pagina']
    templateSheet = ws
  }

  // Create a sheet for each document with annotations
  for (const doc of processedDocs) {
    if (doc.annotations.length === 0) continue

    const sheetName = doc.filename
      .replace(/\.pdf$/i, '')
      .replace(/[^\w\s\-]/g, '')
      .substring(0, 31)

    // Duplicate template sheet
    const newSheet = wb.addWorksheet(sheetName)

    // Copy column widths from template
    templateSheet.columns.forEach((col, idx) => {
      if (col.width) {
        newSheet.getColumn(idx + 1).width = col.width
      }
    })

    // Copy first 3 rows (header structure) from template with styles
    for (let r = 1; r <= 3; r++) {
      const srcRow = templateSheet.getRow(r)
      const destRow = newSheet.getRow(r)
      destRow.height = srcRow.height
      srcRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const destCell = destRow.getCell(colNumber)
        destCell.style = { ...cell.style }
        destCell.value = cell.value
      })
    }

    // Copy merged cells from template (first 3 rows only)
    const merges = (templateSheet as unknown as { _merges: Record<string, unknown> })._merges || {}
    for (const mergeRef of Object.keys(merges)) {
      try {
        // Only copy merges in rows 1-3
        const rowNum = parseInt(mergeRef.replace(/[A-Z]/g, ''))
        if (rowNum <= 3) {
          newSheet.mergeCells(mergeRef)
        }
      } catch { /* skip invalid merges */ }
    }

    // Fill header data
    newSheet.getCell('B1').value = `PARTIDAS: ${doc.filename}`
    newSheet.getCell('D1').value = 'Marca:'
    newSheet.getCell('B2').value = `DESCRIPCION: ${doc.filename}`
    newSheet.getCell('D2').value = 'Modelo:'

    // Fill data rows (starting at row 4)
    doc.annotations.forEach((ann, idx) => {
      const row = newSheet.getRow(idx + 4)

      // Copy style from template row 4 if available
      const templateDataRow = templateSheet!.getRow(4)
      templateDataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const destCell = row.getCell(colNumber)
        destCell.style = { ...cell.style }
      })

      row.getCell(2).value = idx + 1 // Item number
      row.getCell(3).value = `${ann.requirementId}: ${ann.found ? (ann.exactText || '').substring(0, 500) : '(no encontrado)'}` // Spec requirement
      row.getCell(4).value = ann.found ? (ann.exactText || '').substring(0, 500) : '' // Evidence from datasheet
      row.getCell(5).value = ann.found ? 'SI' : 'NO' // Cumple
      row.getCell(6).value = ann.found && ann.pageNum ? `Pag. ${ann.pageNum}` : '' // Page
    })
  }

  // Remove the original template sheet (we only want the filled ones)
  if (templateSheet && wb.worksheets.length > 1) {
    wb.removeWorksheet(templateSheet.id)
  }

  // Add summary sheet (exceljs adds it at the end, which is fine)
  const summary = wb.addWorksheet('Resumen', { properties: { tabColor: { argb: '4472C4' } } })

  summary.getColumn(1).width = 60
  summary.getColumn(2).width = 15
  summary.getColumn(3).width = 25
  summary.getColumn(4).width = 20

  summary.getRow(1).values = ['Proyecto', projectName]
  summary.getRow(1).font = { bold: true }
  summary.getRow(2).values = ['Fecha de Generacion', new Date().toLocaleDateString('es-PE')]
  summary.getRow(3).values = ['Total Documentos Analizados', processedDocs.length]
  summary.getRow(4).values = ['Total Anotaciones Encontradas', processedDocs.reduce((sum, d) => sum + d.annotationCount, 0)]
  summary.getRow(6).values = ['Documento', 'Tipo', 'Requerimientos Encontrados', 'Total Requerimientos']
  summary.getRow(6).font = { bold: true }

  processedDocs.forEach((doc, idx) => {
    summary.getRow(7 + idx).values = [
      doc.filename,
      doc.documentType,
      doc.annotationCount,
      doc.annotations.length,
    ]
  })

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
  const foundAnnotations = annotations.filter(a => a.found && a.pageNum)
  if (foundAnnotations.length === 0) return null

  try {
    const response = await fetch(pdfUrl, {
      headers: { 'Authorization': `Bearer ${blobToken}` },
    })
    if (!response.ok) return null

    const pdfBytes = await response.arrayBuffer()
    const pdfBuffer = Buffer.from(pdfBytes)

    // Step 1: Use pdfjs-dist to extract text positions from the PDF
    // Dynamic require to avoid Turbopack bundling the 'canvas' optional dep
    const pdfjsLib = eval('require')('pdfjs-dist/legacy/build/pdf.js')
    const pdfjsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer), verbosity: 0 }).promise

    // Build a map: pageNumber -> array of { text, x, y, width, height }
    const textPositionsByPage = new Map<number, Array<{ str: string; x: number; y: number; width: number; height: number }>>()

    // Only extract text for pages we need
    const neededPages = new Set(foundAnnotations.map(a => a.pageNum!))
    for (const pageNum of neededPages) {
      const page = await pdfjsDoc.getPage(pageNum)
      const textContent = await page.getTextContent()

      const items: Array<{ str: string; x: number; y: number; width: number; height: number }> = []
      for (const item of textContent.items) {
        if (!('str' in item) || !item.str.trim()) continue
        // transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
        const tx = item.transform[4]
        const ty = item.transform[5]
        const fontSize = Math.abs(item.transform[3]) || Math.abs(item.transform[0])
        const width = item.width
        const height = fontSize

        items.push({
          str: item.str,
          x: tx,
          y: ty,
          width: width,
          height: height,
        })
      }
      textPositionsByPage.set(pageNum, items)
    }

    await pdfjsDoc.destroy()

    // Step 2: Use pdf-lib to draw highlight rectangles
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()

    // Track vertical offset per page for stacking margin notes
    const marginNoteOffset = new Map<number, number>()

    for (const annotation of foundAnnotations) {
      const pageIdx = (annotation.pageNum || 1) - 1
      if (pageIdx < 0 || pageIdx >= pages.length) continue

      const page = pages[pageIdx]
      const textItems = textPositionsByPage.get(annotation.pageNum!) || []
      const noteIdx = marginNoteOffset.get(pageIdx) || 0

      console.log(`[annotatePdf] ${annotation.requirementId}: exactText=${annotation.exactText ? annotation.exactText.substring(0, 50) + '...' : 'NULL'}, textItems=${textItems.length}`)

      if (!annotation.exactText) {
        // No exact text to search — place a note in the right margin
        const { width: pageWidth, height } = page.getSize()
        page.drawText(`[${annotation.requirementId}]`, {
          x: pageWidth - 75,
          y: height - 25 - (noteIdx * 18),
          size: 12,
          color: rgb(0.8, 0, 0), // strong red
          opacity: 1,
        })
        marginNoteOffset.set(pageIdx, noteIdx + 1)
        continue
      }

      // Search for matching text items on the page
      const searchTerms = extractSearchTerms(annotation.exactText)
      const matchedItems = findMatchingTextItems(textItems, searchTerms)

      if (matchedItems.length > 0) {
        // Draw yellow highlight rectangles over matched text
        for (const item of matchedItems) {
          page.drawRectangle({
            x: item.x - 1,
            y: item.y - 2,
            width: item.width + 2,
            height: item.height + 4,
            color: rgb(1, 1, 0), // yellow
            opacity: 0.35,
            borderWidth: 0,
          })
        }

        // Add a REQ label in the right margin at the height of the first match
        const firstMatch = matchedItems[0]
        const { width: pageWidth } = page.getSize()
        page.drawText(annotation.requirementId, {
          x: pageWidth - 70,
          y: firstMatch.y,
          size: 12,
          color: rgb(0, 0.5, 0), // green
          opacity: 1,
        })
      } else {
        // Fallback: no text match found — place note in right margin
        const { width: pageWidth, height } = page.getSize()
        page.drawText(`[${annotation.requirementId}?]`, {
          x: pageWidth - 75,
          y: height - 25 - (noteIdx * 18),
          size: 12,
          color: rgb(0.8, 0, 0), // strong red
          opacity: 1,
        })
        marginNoteOffset.set(pageIdx, noteIdx + 1)
      }
    }

    const annotatedBytes = await pdfDoc.save()
    return Buffer.from(annotatedBytes)
  } catch (err) {
    console.error('[annotatePdf] Error:', err)
    return null
  }
}

/**
 * Extract meaningful search terms from a requirement text.
 * Splits into individual words and also keeps multi-word phrases.
 */
function extractSearchTerms(text: string): string[] {
  // Clean the text: remove newlines, extra spaces
  const cleaned = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()

  // Split into meaningful phrases (sentences or comma-separated chunks)
  const phrases = cleaned.split(/[.,;]\s*/).filter(p => p.length > 3)

  // Also extract individual significant words (>= 4 chars, not common stop words)
  const stopWords = new Set([
    'debe', 'para', 'como', 'será', 'este', 'esta', 'todo', 'cada', 'pueden',
    'tiene', 'desde', 'hasta', 'with', 'that', 'this', 'from', 'have', 'will',
    'been', 'they', 'their', 'which', 'must', 'should', 'including', 'incluir',
    'mismo', 'donde', 'cuando', 'sobre', 'entre', 'forma', 'manera', 'también',
    'además', 'siendo', 'sistema', 'general', 'principales', 'the', 'and', 'for',
  ])
  const words = cleaned
    .split(/\s+/)
    .map(w => w.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ0-9\-\/]/g, ''))
    .filter(w => w.length >= 4 && !stopWords.has(w.toLowerCase()))

  return [...phrases, ...words]
}

/**
 * Find text items on a page that match any of the search terms.
 * Uses case-insensitive substring matching with relaxed criteria.
 */
function findMatchingTextItems(
  textItems: Array<{ str: string; x: number; y: number; width: number; height: number }>,
  searchTerms: string[]
): Array<{ x: number; y: number; width: number; height: number }> {
  const matched: Array<{ x: number; y: number; width: number; height: number }> = []
  const alreadyHighlighted = new Set<number>() // track indices to avoid double-highlighting

  // Extract unique meaningful words from all terms (4+ chars)
  const allWords = new Set<string>()
  for (const term of searchTerms) {
    for (const word of term.toLowerCase().split(/\s+/)) {
      const clean = word.replace(/[^a-záéíóúñ0-9\-\/]/g, '')
      if (clean.length >= 4) allWords.add(clean)
    }
  }
  const uniqueWords = [...allWords]

  // For each text item, check how many search words it contains
  for (let i = 0; i < textItems.length; i++) {
    if (alreadyHighlighted.has(i)) continue
    const itemText = textItems[i].str.toLowerCase()
    if (itemText.length < 3) continue // skip very short fragments

    let matchScore = 0
    for (const word of uniqueWords) {
      if (itemText.includes(word)) {
        matchScore++
      }
    }

    // Highlight if at least 1 word matches for short items,
    // or if the item contains a significant keyword
    if (matchScore >= 1) {
      matched.push(textItems[i])
      alreadyHighlighted.add(i)
    }
  }

  // Limit to max 20 highlights per requirement to avoid over-highlighting
  return matched.slice(0, 20)
}
