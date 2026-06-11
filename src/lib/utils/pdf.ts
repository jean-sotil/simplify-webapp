export class PdfExtractionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'PdfExtractionError'
  }
}

// Max chars sent to the embedding API.
// text-embedding-3-large supports ~8k tokens (~32k chars).
const MAX_EMBED_CHARS = 20_000

export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  // unpdf is built for server/edge runtimes — no worker threads, no DOM deps.
  const { extractText } = await import('unpdf')

  let pages: string[]
  try {
    const result = await extractText(new Uint8Array(buffer), { mergePages: false })
    pages = result.text
  } catch (err) {
    throw new PdfExtractionError('Failed to parse PDF', err)
  }

  if (!pages.length || !pages.join('').trim()) {
    throw new PdfExtractionError(
      'PDF contains no extractable text. ' +
      'The file may be a scanned image — OCR is not supported.'
    )
  }

  const fullText = pages
    .map((pageText, i) => `--- Page ${i + 1} ---\n${pageText}`)
    .join('\n\n')

  return fullText.slice(0, MAX_EMBED_CHARS)
}
