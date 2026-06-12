import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

/**
 * POST /api/extract-pdf
 *
 * Extracts text with page-level granularity from a PDF URL.
 * Used by n8n to avoid needing pdfjs-dist installed locally.
 *
 * Body: { url: string, token?: string }
 * - url: the blob URL of the PDF
 * - token: optional Bearer token for private blobs
 *
 * Returns: { pages: [{ pageNum, text }], totalPages }
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { url, token } = body as { url?: string; token?: string }

  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  // Fetch the PDF
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else if (process.env.BLOB_READ_WRITE_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
  }

  const pdfResponse = await fetch(url, { headers })
  if (!pdfResponse.ok) {
    return NextResponse.json(
      { error: `Failed to fetch PDF: ${pdfResponse.status}` },
      { status: 502 }
    )
  }

  const buffer = await pdfResponse.arrayBuffer()

  // Extract text using unpdf (same library used in the upload pipeline)
  const { extractText } = await import('unpdf')

  let pages: string[]
  try {
    const result = await extractText(new Uint8Array(buffer), { mergePages: false })
    pages = result.text
  } catch (err) {
    return NextResponse.json(
      { error: `PDF extraction failed: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 422 }
    )
  }

  const pageData = pages.map((text, i) => ({
    pageNum: i + 1,
    text: text.trim(),
  }))

  return NextResponse.json({
    pages: pageData,
    totalPages: pageData.length,
  })
}
