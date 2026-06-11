import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

export const maxDuration = 300

/**
 * GET /api/documents/upload?filename=xxx.pdf
 *
 * Generates a short-lived client token for direct browser → Blob uploads.
 * The browser then uses `put()` from @vercel/blob/client with this token.
 * The file never passes through this serverless function.
 */
export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const filename = request.nextUrl.searchParams.get('filename')
  if (!filename) {
    return NextResponse.json({ error: 'filename query param is required' }, { status: 400 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    console.error('[/api/documents/upload] BLOB_READ_WRITE_TOKEN not set')
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }

  try {
    const clientToken = await generateClientTokenFromReadWriteToken({
      token,
      pathname: filename,
      allowedContentTypes: ['application/pdf'],
      maximumSizeInBytes: 50 * 1024 * 1024,
      addRandomSuffix: true,
      validUntil: Date.now() + 5 * 60 * 1000, // 5 minutes
    })

    // Return the token AND the store base URL so the client knows where to PUT
    const storeId = token.replace('vercel_blob_rw_', '').split('_')[0]
    const storeBaseUrl = `https://${storeId}.public.blob.vercel-storage.com`

    return NextResponse.json({ clientToken, storeBaseUrl })
  } catch (error) {
    console.error('[/api/documents/upload] Token generation failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate upload token' },
      { status: 500 }
    )
  }
}
