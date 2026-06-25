import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db.server'

/**
 * POST /api/sustento-references
 * Searches sustento document chunks for keyword matches with unfound requirements.
 * Returns references: { requirementId, documentId, filename }[]
 *
 * Body: { requirementIds: string[], requirementTexts: string[] }
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { requirementIds, requirementTexts } = body as {
    requirementIds: string[]
    requirementTexts: string[]
  }

  if (!requirementIds?.length || !requirementTexts?.length) {
    return NextResponse.json({ references: [] })
  }

  // Get all sustento document IDs
  const { data: sustentoDocs } = await supabaseAdmin
    .from('documents')
    .select('id, filename')
    .eq('document_type', 'sustento')

  if (!sustentoDocs || sustentoDocs.length === 0) {
    return NextResponse.json({ references: [] })
  }

  const sustentoDocIds = sustentoDocs.map(d => d.id)
  const docMap = new Map(sustentoDocs.map(d => [d.id, d.filename]))

  // Get chunks from sustento documents
  const { data: chunks } = await supabaseAdmin
    .from('document_chunks')
    .select('document_id, chunk_text')
    .in('document_id', sustentoDocIds)

  if (!chunks || chunks.length === 0) {
    return NextResponse.json({ references: [] })
  }

  // Build text index per document
  const docTexts = new Map<string, string>()
  for (const chunk of chunks) {
    const existing = docTexts.get(chunk.document_id) || ''
    docTexts.set(chunk.document_id, existing + ' ' + chunk.chunk_text.toLowerCase())
  }

  // For each requirement, search for keyword matches in sustento documents
  const references: Array<{ requirementId: string; documentId: string; filename: string }> = []

  for (let i = 0; i < requirementIds.length; i++) {
    const reqId = requirementIds[i]
    const reqText = requirementTexts[i]
    if (!reqText) continue

    // Extract significant keywords (4+ chars)
    const words = reqText.toLowerCase()
      .replace(/[^a-záéíóúñ0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4)

    if (words.length === 0) continue

    // Find best matching sustento document
    let bestDocId: string | null = null
    let bestScore = 0
    const threshold = Math.max(2, Math.ceil(words.length * 0.3))

    for (const [docId, docText] of docTexts) {
      const matchCount = words.filter(w => docText.includes(w)).length
      if (matchCount >= threshold && matchCount > bestScore) {
        bestScore = matchCount
        bestDocId = docId
      }
    }

    if (bestDocId) {
      references.push({
        requirementId: reqId,
        documentId: bestDocId,
        filename: docMap.get(bestDocId) || '',
      })
    }
  }

  return NextResponse.json({ references })
}
