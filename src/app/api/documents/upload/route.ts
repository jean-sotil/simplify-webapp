import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

/**
 * POST /api/documents/upload
 *
 * Vercel Blob client upload handler.
 * The actual file goes directly from browser → Vercel Blob (bypassing this function).
 * This route only:
 *   1. Generates a temporary upload token (onBeforeGenerateToken)
 *   2. Receives a completion callback (onUploadCompleted)
 *
 * The file never passes through this serverless function,
 * so the 4.5 MB body limit does NOT apply.
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
          maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id }),
        }
      },
      onUploadCompleted: async () => {
        // No-op — client calls indexUploadedDocument after upload completes
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('[/api/documents/upload] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    )
  }
}
