import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

export const maxDuration = 300

/**
 * POST /api/documents/upload
 *
 * Vercel Blob client-upload handler using handleUpload.
 * The SDK's upload() on the client calls this route to get a token,
 * then uploads directly to Blob infrastructure.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (_pathname, _clientPayload, _multipart) => {
        const user = await getUser()
        if (!user) {
          throw new Error('Unauthorized')
        }

        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 50 * 1024 * 1024,
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000, // 10 minutes
          tokenPayload: JSON.stringify({ userId: user.id }),
        }
      },
      onUploadCompleted: async () => {
        // Client calls indexUploadedDocument after this
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('[/api/documents/upload] handleUpload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    )
  }
}
