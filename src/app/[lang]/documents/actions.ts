'use server'

import { revalidatePath } from 'next/cache'
import { put } from '@vercel/blob'
import { supabaseAdmin } from '@/lib/db.server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { DocumentUploadSchema } from '@/lib/validation/schemas'
import { extractTextFromPdf } from '@/lib/utils/pdf'
import { generateEmbedding } from '@/lib/ai/openai'

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

  // Generate embedding only when we have text to embed
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
