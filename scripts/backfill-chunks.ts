/**
 * Backfill script: generates chunked embeddings for existing documents.
 *
 * Reads documents that have `extracted_text` but no rows in `document_chunks`.
 * For each document, chunks the text and generates embeddings via OpenAI API.
 *
 * Usage:
 *   npx tsx scripts/backfill-chunks.ts
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * OPENAI_API_KEY, OPENAI_BASE_URL
 */

import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { createClient } from '@supabase/supabase-js'
import { chunkPdfText } from '../src/lib/utils/pdf-chunker'

// Dynamic import to ensure env vars are loaded before module-level checks
async function getEmbeddingFn() {
  const { generateEmbeddingsBatch } = await import('../src/lib/ai/openai')
  return generateEmbeddingsBatch
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BATCH_SIZE = 50 // embeddings per API call

async function main() {
  const generateEmbeddingsBatch = await getEmbeddingFn()

  console.log('🔍 Finding documents without chunks...')

  // Find documents that have extracted_text but no chunks yet
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, filename, extracted_text')
    .not('extracted_text', 'eq', '')
    .not('extracted_text', 'is', null)

  if (error) {
    console.error('Failed to fetch documents:', error)
    process.exit(1)
  }

  if (!documents || documents.length === 0) {
    console.log('✅ No documents to process.')
    return
  }

  // Filter out documents that already have chunks
  const { data: existingChunks } = await supabase
    .from('document_chunks')
    .select('document_id')

  const docsWithChunks = new Set(
    (existingChunks ?? []).map((c: { document_id: string }) => c.document_id)
  )

  const docsToProcess = documents.filter((d) => !docsWithChunks.has(d.id))

  console.log(`📄 ${docsToProcess.length} documents need chunking (${documents.length} total, ${docsWithChunks.size} already done)`)

  let totalChunks = 0
  let processedDocs = 0

  for (const doc of docsToProcess) {
    const extractedText = doc.extracted_text as string
    if (!extractedText.trim()) continue

    const chunks = chunkPdfText(extractedText)
    if (chunks.length === 0) {
      console.log(`  ⏭️  ${doc.filename} — no chunks generated (empty text)`)
      continue
    }

    console.log(`  📝 ${doc.filename} — ${chunks.length} chunks`)

    // Process in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const texts = batch.map((c) => c.text)

      try {
        const embeddings = await generateEmbeddingsBatch(texts)

        const rows = batch.map((chunk, idx) => ({
          document_id: doc.id,
          chunk_index: chunk.chunkIndex,
          page_number: chunk.pageNumber,
          chunk_text: chunk.text,
          embedding: embeddings[idx],
        }))

        const { error: insertError } = await supabase
          .from('document_chunks')
          .insert(rows)

        if (insertError) {
          console.error(`    ❌ Insert error for ${doc.filename} batch ${i}:`, insertError.message)
        } else {
          totalChunks += batch.length
        }
      } catch (err) {
        console.error(`    ❌ Embedding error for ${doc.filename} batch ${i}:`, err)
      }
    }

    processedDocs++

    // Rate limiting: pause between documents to avoid API throttling
    if (processedDocs < docsToProcess.length) {
      await sleep(500)
    }
  }

  console.log(`\n✅ Done! Processed ${processedDocs} documents, created ${totalChunks} chunks.`)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
