export class PdfExtractionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'PdfExtractionError'
  }
}

// Max chars to embed — text-embedding-3-large supports ~8k tokens (~32k chars).
// Truncating avoids API errors on large documents while keeping the most
// important content (front-loaded in most technical specs).
const MAX_EMBED_CHARS = 30_000

export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  // pdf-parse is a pure Node.js library with no browser dependencies.
  // Dynamic import keeps it out of the client bundle.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import('pdf-parse') as any
  const pdfParse = mod.default ?? mod

  let result: { text: string; numpages: number }
  try {
    result = await pdfParse(Buffer.from(buffer))
  } catch (err) {
    throw new PdfExtractionError('Failed to parse PDF', err)
  }

  if (!result.text?.trim()) {
    throw new PdfExtractionError(
      `PDF has ${result.numpages} page(s) but contains no extractable text. ` +
      'The file may be a scanned image — OCR is not supported.'
    )
  }

  // Truncate to embedding limit
  return result.text.slice(0, MAX_EMBED_CHARS)
}
