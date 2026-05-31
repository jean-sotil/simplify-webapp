import * as pdfjs from 'pdfjs-dist'
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api'

// In a Node.js / server-action context, pdfjs-dist v5 does not need a real
// worker. Pointing workerSrc at an empty string disables the worker thread
// and falls back to the synchronous fake-worker bundled in the main build.
if (typeof window === 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = ''
}

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
 */
export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  let pdf: pdfjs.PDFDocumentProxy

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
