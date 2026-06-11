import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

/**
 * Client upload handler for Vercel Blob.
 * The client sends the file directly to Vercel Blob (bypassing the 4.5 MB
 * serverless body limit). This route only handles token generation and
 * completion callbacks.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Auth check — only authenticated users can upload
        const user = await getUser()
        if (!user) {
          throw new Error('Unauthorized')
        }

        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB
          tokenPayload: JSON.stringify({ userId: user.id }),
        }
      },
      onUploadCompleted: async () => {
        // No-op — the client will call the server action to register in DB
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    )
  }
}
