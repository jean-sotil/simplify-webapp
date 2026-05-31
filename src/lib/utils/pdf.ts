export class PdfExtractionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'PdfExtractionError'
  }
}

// Max chars sent to the embedding API.
// text-embedding-3-large supports ~8k tokens (~32k chars).
const MAX_EMBED_CHARS = 30_000

export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')

  const parser = new PDFParse({ data: Buffer.from(buffer) })

  let result: { text: string; total: number }
  try {
    result = await parser.getText()
  } catch (err) {
    throw new PdfExtractionError('Failed to parse PDF', err)
  }

  if (!result.text?.trim()) {
    throw new PdfExtractionError(
      `PDF has ${result.total} page(s) but no extractable text. ` +
      'The file may be a scanned image — OCR is not supported.'
    )
  }

  return result.text.slice(0, MAX_EMBED_CHARS)
}
