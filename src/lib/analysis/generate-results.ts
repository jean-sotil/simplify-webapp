import 'server-only'

import { PDFDocument, rgb } from 'pdf-lib'
import * as XLSX from 'xlsx'
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
  const { processedDocs, analysisId, projectName } = input
  const blobToken = input.blobToken || process.env.BLOB_READ_WRITE_TOKEN || ''

  const zipFiles: Array<{ name: string; buffer: Buffer }> = []

  // 1. Generate annotated PDFs for docs that have found annotations
  for (const doc of processedDocs) {
    const foundAnnotations = doc.annotations.filter(a => a.found && a.pageNum)
    if (foundAnnotations.length === 0 || !doc.originalFileUrl) continue

    console.log(`[generate-results] Annotating PDF: ${doc.filename} (${foundAnnotations.length} highlights)`)
    const annotatedPdf = await annotatePdf(doc.originalFileUrl, doc.annotations, blobToken)
    if (annotatedPdf) {
      zipFiles.push({ name: `annotated/${doc.filename}`, buffer: annotatedPdf })
    }
  }

  // 2. Generate Compliance Matrix Excel
  const excelBuffer = generateComplianceExcel(processedDocs, projectName)
  zipFiles.push({ name: `Matriz_Cumplimiento_${projectName.replace(/\s+/g, '_')}.xlsx`, buffer: excelBuffer })

  // 3. Create ZIP
  const zipBuffer = await createZipBuffer(zipFiles)

  // 4. Upload ZIP to Blob
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
 * Generates the Compliance Matrix Excel using the template file as base.
 * Creates one tab per document, preserving the template's formatting.
 */
function generateComplianceExcel(processedDocs: ProcessedDocument[], projectName: string): Buffer {
  // Create workbook from scratch (template approach caused fs issues in serverless)
  const wb = XLSX.utils.book_new()

  // Summary sheet
  const summaryData = [
    ['PROYECTO', projectName],
    ['Fecha de Generación', new Date().toLocaleDateString('es-PE')],
    ['Total Documentos Analizados', processedDocs.length],
    ['Total Anotaciones Encontradas', processedDocs.reduce((sum, d) => sum + d.annotationCount, 0)],
    [],
    ['Documento', 'Tipo', 'Requerimientos Encontrados', 'Total Requerimientos'],
    ...processedDocs.map(doc => [
      doc.filename,
      doc.documentType,
      doc.annotationCount,
      doc.annotations.length,
    ]),
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  summaryWs['!cols'] = [{ wch: 60 }, { wch: 12 }, { wch: 25 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen')

  // One sheet per document (matching template structure)
  for (const doc of processedDocs) {
    if (doc.annotations.length === 0) continue

    const sheetName = doc.filename
      .replace(/\.pdf$/i, '')
      .replace(/[^\w\s\-áéíóúñÁÉÍÓÚÑ]/g, '')
      .substring(0, 31)

    // Build rows matching template structure:
    // Row 0: PARTIDAS: <code>  |  (empty)  |  Marca: <brand>
    // Row 1: DESCRIPCIÓN: <desc>  |  (empty)  |  Modelo: <model>
    // Row 2: Ítem | Especificaciones técnicas | Especificaciones técnicas Fichas | Cumple | Página
    // Row 3+: data rows
    const sheetData: (string | number | null)[][] = [
      [`PARTIDAS: `, null, `Marca: `],
      [`DESCRIPCIÓN: ${doc.filename}`, null, `Modelo: `],
      ['Ítem', 'Especificaciones técnicas', 'Especificaciones técnicas Fichas', 'Cumple', 'Página'],
      ...doc.annotations.map((ann, idx) => [
        idx + 1,
        ann.requirementId + ': ' + (ann.found ? ann.exactText || '' : '(no encontrado)').substring(0, 300),
        ann.found ? (ann.exactText || '').substring(0, 300) : '',
        ann.found ? 'SI' : 'NO',
        ann.found && ann.pageNum ? `Pág. ${ann.pageNum}` : '',
      ]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(sheetData)
    ws['!cols'] = [
      { wch: 6 },   // Ítem
      { wch: 70 },  // Especificaciones técnicas
      { wch: 70 },  // Especificaciones técnicas Fichas
      { wch: 10 },  // Cumple
      { wch: 15 },  // Página
    ]

    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
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
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()

    for (const annotation of foundAnnotations) {
      const pageIdx = (annotation.pageNum || 1) - 1
      if (pageIdx < 0 || pageIdx >= pages.length) continue

      const page = pages[pageIdx]
      const { height } = page.getSize()

      // Draw a highlight banner at the top of the page indicating the requirement
      page.drawRectangle({
        x: 20,
        y: height - 30,
        width: 400,
        height: 18,
        color: rgb(1, 1, 0), // yellow
        opacity: 0.4,
      })

      page.drawText(`${annotation.requirementId} - Evidence on this page`, {
        x: 25,
        y: height - 26,
        size: 8,
        color: rgb(0.6, 0, 0),
        opacity: 0.9,
      })
    }

    const annotatedBytes = await pdfDoc.save()
    return Buffer.from(annotatedBytes)
  } catch {
    return null
  }
}
