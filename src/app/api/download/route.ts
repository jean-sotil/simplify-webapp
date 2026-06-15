import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

/**
 * GET /api/download?url=<blob-url>
 *
 * Proxy endpoint to download files from the private Vercel Blob store.
 * Requires authentication. Streams the file to the client.
 */
export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 })
  }

  const inline = request.nextUrl.searchParams.get('inline') === '1'

  // Only allow downloads from our blob store
  if (!url.includes('blob.vercel-storage.com')) {
    return NextResponse.json({ error: 'Invalid download URL' }, { status: 400 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!response.ok) {
    return NextResponse.json(
      { error: `Download failed: ${response.status}` },
      { status: response.status }
    )
  }

  // Extract filename from URL
  const pathname = new URL(url).pathname
  const filename = decodeURIComponent(pathname.split('/').pop() || 'download')

  // Stream the response to the client
  const disposition = inline
    ? `inline; filename="${filename}"`
    : `attachment; filename="${filename}"`

  return new NextResponse(response.body, {
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': disposition,
      'Content-Length': response.headers.get('content-length') || '',
    },
  })
}
