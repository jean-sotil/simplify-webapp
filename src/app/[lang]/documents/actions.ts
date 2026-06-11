'use server'

import { revalidatePath } from 'next/cache'
import { put } from '@vercel/blob'
import { supabaseAdmin } from '@/lib/db.server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { DocumentUploadSchema } from '@/lib/validation/schemas'
import { extractTextFromPdf } from '@/lib/utils/pdf'
import { chunkPdfText } from '@/lib/utils/pdf-chunker'
import { generateEmbedding, generateEmbeddingsBatch } from '@/lib/ai/openai'

async function requireAuth() {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function uploadDocument(formData: FormData) {
  const user = await requireAuth()

  const file = formData.get('file') as File | null
  const documentType = formData.get('documentType') as string | null
  const teamId = (formData.get('teamId') as string | null) ?? null

  if (!file || !documentType) {
    return { error: 'Missing required fields' }
  }

  const parsed = DocumentUploadSchema.safeParse({
    file: { name: file.name, size: file.size, type: file.type },
    documentType,
    teamId,
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Read the file into memory before passing to @vercel/blob.
  // FormData File streams in Next.js Server Actions can be in a partially
  // consumed state; converting to Buffer guarantees undici gets a clean body.
  const fileBuffer = Buffer.from(await file.arrayBuffer())

  // Upload original file to Vercel Blob
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
    return {
      error: `File upload failed: ${err instanceof Error ? err.message : 'unknown error'}`,
    }
  }

  // Extract text from PDF
  let extractedText = ''
  let indexingWarning: string | null = null

  try {
    const buffer = await file.arrayBuffer()
    extractedText = await extractTextFromPdf(buffer)
  } catch (err) {
    indexingWarning = err instanceof Error ? err.message : 'PDF text extraction failed'
    console.error('[uploadDocument] PDF extraction error:', err)
  }

  // Generate a whole-document embedding (kept for backward compatibility)
  let embedding: number[] | null = null
  if (extractedText) {
    try {
      embedding = await generateEmbedding(extractedText)
    } catch (err) {
      indexingWarning = `Embedding failed: ${err instanceof Error ? err.message : 'unknown error'}`
      console.error('[uploadDocument] Embedding error:', err)
    }
  }

  // Insert document record into the database
  const supabase = await createSupabaseServerClient()
  const { data: document, error: dbError } = await supabase
    .from('documents')
    .insert({
      team_id: null,
      filename: file.name,
      document_type: documentType,
      original_file_url: blobUrl,
      extracted_text: extractedText,
      embedding: embedding,
      uploaded_by: user.id,
      metadata: {},
    })
    .select()
    .single()

  if (dbError) return { error: dbError.message }

  // ─── Chunked Embeddings ────────────────────────────────────────────────────
  // Generate per-page/section chunks and embed them individually for better
  // semantic search granularity (hardware docs especially benefit from this).
  if (extractedText && document) {
    try {
      const chunks = chunkPdfText(extractedText)
      if (chunks.length > 0) {
        // Batch embed all chunks (API supports up to 2048 inputs per call)
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
            console.error('[uploadDocument] Chunk insert error:', chunkError)
            indexingWarning = indexingWarning ?? 'Some chunks failed to index'
          }
        }
      }
    } catch (err) {
      console.error('[uploadDocument] Chunking pipeline error:', err)
      indexingWarning = indexingWarning ?? `Chunking failed: ${err instanceof Error ? err.message : 'unknown error'}`
    }
  }

  await supabaseAdmin.from('audit_logs').insert({
    user_id: user.id,
    team_id: null,
    action: 'uploaded',
    resource_type: 'document',
    resource_id: document.id,
  })

  revalidatePath('/[lang]/documents', 'page')
  return { data: document, warning: indexingWarning ?? undefined }
}

// ---------------------------------------------------------------------------
// indexUploadedDocument — for client-side blob uploads
// ---------------------------------------------------------------------------

/**
 * Registers and indexes a document that was already uploaded to Vercel Blob
 * via client-side upload. This avoids the 4.5 MB serverless body limit.
 *
 * Flow: Client uploads file to Blob → gets blobUrl → calls this action.
 */
export async function indexUploadedDocument(params: {
  blobUrl: string
  filename: string
  documentType: 'ett' | 'hardware'
  teamId?: string
}) {
  const user = await requireAuth()
  const { blobUrl, filename, documentType, teamId: _teamId } = params

  if (!blobUrl || !filename || !documentType) {
    return { error: 'Missing required fields' }
  }

  // Fetch the PDF from blob to extract text
  let extractedText = ''
  let indexingWarning: string | null = null

  try {
    const response = await fetch(blobUrl)
    if (!response.ok) throw new Error(`Failed to fetch blob: ${response.status}`)
    const buffer = await response.arrayBuffer()
    extractedText = await extractTextFromPdf(buffer)
  } catch (err) {
    indexingWarning = err instanceof Error ? err.message : 'PDF text extraction failed'
    console.error('[indexUploadedDocument] PDF extraction error:', err)
  }

  // Generate whole-document embedding
  let embedding: number[] | null = null
  if (extractedText) {
    try {
      embedding = await generateEmbedding(extractedText)
    } catch (err) {
      indexingWarning = `Embedding failed: ${err instanceof Error ? err.message : 'unknown error'}`
      console.error('[indexUploadedDocument] Embedding error:', err)
    }
  }

  // Insert document record
  const supabase = await createSupabaseServerClient()
  const { data: document, error: dbError } = await supabase
    .from('documents')
    .insert({
      team_id: null,
      filename,
      document_type: documentType,
      original_file_url: blobUrl,
      extracted_text: extractedText,
      embedding,
      uploaded_by: user.id,
      metadata: {},
    })
    .select()
    .single()

  if (dbError) return { error: dbError.message }

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
            console.error('[indexUploadedDocument] Chunk insert error:', chunkError)
            indexingWarning = indexingWarning ?? 'Some chunks failed to index'
          }
        }
      }
    } catch (err) {
      console.error('[indexUploadedDocument] Chunking error:', err)
      indexingWarning = indexingWarning ?? `Chunking failed: ${err instanceof Error ? err.message : 'unknown error'}`
    }
  }

  await supabaseAdmin.from('audit_logs').insert({
    user_id: user.id,
    team_id: null,
    action: 'uploaded',
    resource_type: 'document',
    resource_id: document.id,
  })

  revalidatePath('/[lang]/documents', 'page')
  return { data: document, warning: indexingWarning ?? undefined }
}

export async function deleteDocument(id: string) {
  const user = await requireAuth()
  const supabase = await createSupabaseServerClient()

  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('team_id, original_file_url')
    .eq('id', id)
    .single()

  if (fetchError) return { error: fetchError.message }

  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) return { error: error.message }

  await supabaseAdmin.from('audit_logs').insert({
    user_id: user.id,
    team_id: doc.team_id,
    action: 'deleted',
    resource_type: 'document',
    resource_id: id,
  })

  revalidatePath('/[lang]/documents', 'page')
  return { success: true }
}
