import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

export const maxDuration = 300

/**
 * POST /api/documents/upload
 *
 * Vercel Blob client-upload token handler.
 * The browser sends the file directly to Vercel Blob CDN — it never passes
 * through this function, so the 4.5 MB serverless body limit does not apply.
 *
 * This route only:
 *   1. Generates a short-lived client token (onBeforeGenerateToken)
 *   2. Receives a callback when upload finishes (onUploadCompleted)
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, _clientPayload, _multipart) => {
        const user = await getUser()
        if (!user) {
          throw new Error('Unauthorized')
        }

        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 50 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id }),
        }
      },
      onUploadCompleted: async () => {
        // Client will call indexUploadedDocument server action after this
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('[/api/documents/upload]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    )
  }
}
