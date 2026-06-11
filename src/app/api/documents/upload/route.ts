import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

export const maxDuration = 300

/**
 * GET /api/documents/upload?filename=xxx.pdf
 *
 * Generates a client token for direct browser → Blob uploads.
 * The client uses this token with `put()` from @vercel/blob/client.
 */
export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const filename = request.nextUrl.searchParams.get('filename')
  if (!filename) {
    return NextResponse.json({ error: 'filename is required' }, { status: 400 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    console.error('[/api/documents/upload] BLOB_READ_WRITE_TOKEN is not set')
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }

  try {
    const clientToken = await generateClientTokenFromReadWriteToken({
      token,
      pathname: filename,
      allowedContentTypes: ['application/pdf'],
      maximumSizeInBytes: 50 * 1024 * 1024,
      addRandomSuffix: true,
    })

    return NextResponse.json({ clientToken })
  } catch (error) {
    console.error('[/api/documents/upload] Token generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Token generation failed' },
      { status: 500 }
    )
  }
}
