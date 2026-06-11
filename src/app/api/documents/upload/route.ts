import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { supabaseAdmin } from '@/lib/db.server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { extractTextFromPdf } from '@/lib/utils/pdf'
import { chunkPdfText } from '@/lib/utils/pdf-chunker'
import { generateEmbedding, generateEmbeddingsBatch } from '@/lib/ai/openai'

/**
 * POST /api/documents/upload
 *
 * Route Handler for document uploads. Uses FormData (multipart).
 * Route Handlers do NOT have the 4.5 MB body size limit that Server Actions have.
 * The `bodySizeLimit` in next.config.ts (52mb) applies here.
 */
export async function POST(request: NextRequest) {
  // Auth
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const documentType = formData.get('documentType') as string | null

  if (!file || !documentType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be 50 MB or smaller' }, { status: 400 })
  }

  // Upload to Vercel Blob
  const fileBuffer = Buffer.from(await file.arrayBuffer())
  let blobUrl: string
  try {
    const blob = await put(file.name, fileBuffer, {
      access: 'private',
      addRandomSuffix: true,
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    blobUrl = blob.url
  } catch (err) {
    return NextResponse.json(
      { error: `File upload failed: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 500 }
    )
  }

  // Extract text from PDF
  let extractedText = ''
  let indexingWarning: string | null = null

  try {
    extractedText = await extractTextFromPdf(fileBuffer.buffer as ArrayBuffer)
  } catch (err) {
    indexingWarning = err instanceof Error ? err.message : 'PDF text extraction failed'
  }

  // Generate whole-document embedding
  let embedding: number[] | null = null
  if (extractedText) {
    try {
      embedding = await generateEmbedding(extractedText)
    } catch (err) {
      indexingWarning = `Embedding failed: ${err instanceof Error ? err.message : 'unknown'}`
    }
  }

  // Insert document record
  const supabase = await createSupabaseServerClient()
  const { data: document, error: dbError } = await supabase
    .from('documents')
    .insert({
      team_id: null,
      filename: file.name,
      document_type: documentType,
      original_file_url: blobUrl,
      extracted_text: extractedText,
      embedding,
      uploaded_by: user.id,
      metadata: {},
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Generate chunked embeddings
  if (extractedText && document) {
    try {
      const chunks = chunkPdfText(extractedText)
      if (chunks.length > 0) {
        const BATCH_SIZE = 50
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
          const batch = chunks.slice(i, i + BATCH_SIZE)
          const texts = batch.map((c) => c.text)
          const embeddings = await generateEmbeddingsBatch(texts)

          const rows = batch.map((chunk, idx) => ({
            document_id: document.id,
            chunk_index: chunk.chunkIndex,
            page_number: chunk.pageNumber,
            chunk_text: chunk.text,
            embedding: embeddings[idx],
          }))

          const { error: chunkError } = await supabaseAdmin
            .from('document_chunks')
            .insert(rows)

          if (chunkError) {
            indexingWarning = indexingWarning ?? 'Some chunks failed to index'
          }
        }
      }
    } catch (err) {
      indexingWarning = indexingWarning ?? `Chunking failed: ${err instanceof Error ? err.message : 'unknown'}`
    }
  }

  // Audit log
  await supabaseAdmin.from('audit_logs').insert({
    user_id: user.id,
    team_id: null,
    action: 'uploaded',
    resource_type: 'document',
    resource_id: document.id,
  })

  return NextResponse.json({
    data: document,
    warning: indexingWarning ?? undefined,
  })
}

// Increase body size limit for this route
export const config = {
  api: {
    bodyParser: false,
  },
}
