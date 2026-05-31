// Type-only imports are erased at compile time and do not trigger module
// evaluation, so pdfjs-dist browser globals are never accessed at build time.
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api'
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api'

export class PdfExtractionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'PdfExtractionError'
  }
}

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return 'str' in item
}

/**
 * Extracts all readable text from a PDF buffer.
 * Each page is prefixed with "--- Page N ---".
 * Throws PdfExtractionError if the document cannot be loaded, is empty, or
 * contains no extractable text.
 *
 * pdfjs-dist is dynamically imported to prevent its browser-only module-level
 * code (DOMMatrix, canvas globals) from executing during Next.js build-time
 * static page data collection.
 */
export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  // Dynamic import defers module evaluation to request time, never build time.
  const pdfjs = await import('pdfjs-dist')

  // In Node.js / server-action context, disable the worker thread by pointing
  // workerSrc at an empty string. pdfjs-dist falls back to the synchronous
  // fake-worker bundled inside the main build.
  if (typeof window === 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = ''
  }

  let pdf: PDFDocumentProxy

  try {
    const loadingTask = pdfjs.getDocument({
      data: buffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    })
    pdf = await loadingTask.promise
  } catch (err) {
    throw new PdfExtractionError('Failed to load PDF document', err)
  }

  if (pdf.numPages === 0) {
    throw new PdfExtractionError('PDF has no pages')
  }

  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()

    const pageText = content.items
      .filter(isTextItem)
      .map((item) => item.str)
      .join(' ')
      .trim()

    pages.push(`--- Page ${pageNumber} ---\n${pageText}`)
  }

  const fullText = pages.join('\n\n')

  if (!fullText.trim()) {
    throw new PdfExtractionError('PDF contains no extractable text')
  }

  return fullText
}
