/**
 * PDF text chunking utilities.
 * Splits extracted PDF text into page-level chunks suitable for individual embeddings.
 *
 * Strategy:
 * - Split by page markers (--- Page N ---) inserted by extractTextFromPdf
 * - If a page is too long (> MAX_CHUNK_CHARS), split further by paragraphs
 * - Overlap between splits for context continuity
 */

export interface PdfChunk {
  /** 0-based index within the document */
  chunkIndex: number
  /** 1-based page number (null if not determinable) */
  pageNumber: number | null
  /** The chunk text content */
  text: string
}

// Target chunk size for embeddings. text-embedding-3-large handles ~8k tokens (~32k chars).
// We aim for ~2000 chars per chunk for good semantic density.
const TARGET_CHUNK_CHARS = 2000
const MAX_CHUNK_CHARS = 3500
const OVERLAP_CHARS = 200

const PAGE_MARKER_PATTERN = /^--- Page (\d+) ---$/m

/**
 * Splits raw extracted PDF text (with page markers) into embedding-ready chunks.
 * Returns an array of chunks with page numbers and sequential indices.
 */
export function chunkPdfText(extractedText: string): PdfChunk[] {
  if (!extractedText.trim()) return []

  // Split by page markers
  const pageSegments = splitByPages(extractedText)

  const chunks: PdfChunk[] = []
  let chunkIndex = 0

  for (const segment of pageSegments) {
    if (!segment.text.trim()) continue

    if (segment.text.length <= MAX_CHUNK_CHARS) {
      // Page fits in a single chunk
      chunks.push({
        chunkIndex,
        pageNumber: segment.pageNumber,
        text: segment.text.trim(),
      })
      chunkIndex++
    } else {
      // Page is too long — split into sub-chunks with overlap
      const subChunks = splitLongText(segment.text, TARGET_CHUNK_CHARS, OVERLAP_CHARS)
      for (const subText of subChunks) {
        if (!subText.trim()) continue
        chunks.push({
          chunkIndex,
          pageNumber: segment.pageNumber,
          text: subText.trim(),
        })
        chunkIndex++
      }
    }
  }

  return chunks
}

interface PageSegment {
  pageNumber: number | null
  text: string
}

function splitByPages(text: string): PageSegment[] {
  const parts = text.split(PAGE_MARKER_PATTERN)
  const segments: PageSegment[] = []

  // parts alternates: [textBefore, pageNum, pageText, pageNum, pageText, ...]
  // If there's text before the first page marker, it's preamble
  if (parts[0]?.trim()) {
    segments.push({ pageNumber: null, text: parts[0] })
  }

  for (let i = 1; i < parts.length; i += 2) {
    const pageNumber = parseInt(parts[i], 10)
    const pageText = parts[i + 1] ?? ''
    segments.push({ pageNumber, text: pageText })
  }

  // If no page markers were found, treat entire text as one segment
  if (segments.length === 0) {
    segments.push({ pageNumber: null, text })
  }

  return segments
}

/**
 * Splits a long text into chunks of approximately targetSize chars,
 * splitting at paragraph boundaries when possible, with overlap.
 */
function splitLongText(text: string, targetSize: number, overlap: number): string[] {
  const paragraphs = text.split(/\n{2,}/)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if (current.length + para.length + 1 > targetSize && current.length > 0) {
      chunks.push(current)
      // Start new chunk with overlap from end of previous
      const overlapText = current.slice(-overlap)
      current = overlapText + '\n\n' + para
    } else {
      current = current ? current + '\n\n' + para : para
    }
  }

  if (current.trim()) {
    chunks.push(current)
  }

  return chunks
}
