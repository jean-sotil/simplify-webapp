/**
 * PDF text chunking utilities.
 * Splits extracted PDF text into chunks optimized for semantic search.
 *
 * Strategy:
 * - Split by page markers (--- Page N ---) inserted by extractTextFromPdf
 * - Further split pages into smaller chunks (~800 chars) for precise search
 * - Overlap between chunks for context continuity
 * - Minimum chunk size to avoid garbage embeddings
 */

export interface PdfChunk {
  /** 0-based index within the document */
  chunkIndex: number
  /** 1-based page number (null if not determinable) */
  pageNumber: number | null
  /** The chunk text content */
  text: string
}

// Smaller chunks = more precise search results
const TARGET_CHUNK_CHARS = 800
const MAX_CHUNK_CHARS = 1200
const OVERLAP_CHARS = 150
const MIN_CHUNK_CHARS = 50

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
    const trimmed = segment.text.trim()
    if (!trimmed || trimmed.length < MIN_CHUNK_CHARS) continue

    if (trimmed.length <= MAX_CHUNK_CHARS) {
      // Page fits in a single chunk
      chunks.push({
        chunkIndex,
        pageNumber: segment.pageNumber,
        text: trimmed,
      })
      chunkIndex++
    } else {
      // Page is too long — split into sub-chunks with overlap
      const subChunks = splitLongText(trimmed, TARGET_CHUNK_CHARS, OVERLAP_CHARS)
      for (const subText of subChunks) {
        const sub = subText.trim()
        if (sub.length < MIN_CHUNK_CHARS) continue
        chunks.push({
          chunkIndex,
          pageNumber: segment.pageNumber,
          text: sub,
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
 * Splits a long text into chunks of approximately targetSize chars.
 * Tries to split at sentence boundaries (. ! ? \n) for semantic coherence.
 * Includes overlap for context continuity.
 */
function splitLongText(text: string, targetSize: number, overlap: number): string[] {
  // Split at sentence boundaries
  const sentences = text.split(/(?<=[.!?\n])\s+/)
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > targetSize && current.length > 0) {
      chunks.push(current)
      // Start new chunk with overlap from end of previous
      const overlapText = current.slice(-overlap)
      current = overlapText + ' ' + sentence
    } else {
      current = current ? current + ' ' + sentence : sentence
    }
  }

  if (current.trim()) {
    chunks.push(current)
  }

  return chunks
}
