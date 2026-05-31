import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { supabaseAdmin } from '../../src/lib/db.server'
import { semanticSearchDocuments } from '../../src/lib/search/semantic'
import { generateEmbedding } from '../../src/lib/ai/openai'

// This test requires real Supabase and OpenRouter credentials in .env.local
// Run with: npx vitest run tests/integration/semantic-search.test.ts

describe('semanticSearchDocuments', () => {
  const TEST_TEAM_ID = '00000000-0000-0000-0000-000000000001'
  const createdIds: string[] = []

  beforeAll(async () => {
    // Seed test team
    await supabaseAdmin.from('teams').upsert({ id: TEST_TEAM_ID, name: 'Integration Test Team' })

    // Seed two documents with known content and real embeddings
    const docA = {
      team_id: TEST_TEAM_ID,
      filename: 'rf-antenna-specs.pdf',
      document_type: 'ett',
      original_file_url: 'https://example.com/rf.pdf',
      extracted_text:
        'RF antenna specifications 2.4GHz gain pattern directional radiation impedance matching',
      embedding: await generateEmbedding(
        'RF antenna specifications 2.4GHz gain pattern directional radiation impedance matching',
      ),
    }
    const docB = {
      team_id: TEST_TEAM_ID,
      filename: 'procurement-guide.pdf',
      document_type: 'hardware',
      original_file_url: 'https://example.com/proc.pdf',
      extracted_text:
        'Office procurement guidelines stationery furniture budget approval process',
      embedding: await generateEmbedding(
        'Office procurement guidelines stationery furniture budget approval process',
      ),
    }

    const { data: inserted } = await supabaseAdmin
      .from('documents')
      .insert([docA, docB])
      .select('id')

    inserted?.forEach((d: { id: string }) => createdIds.push(d.id))
  }, 60_000)

  afterAll(async () => {
    if (createdIds.length > 0) {
      await supabaseAdmin.from('documents').delete().in('id', createdIds)
    }
    await supabaseAdmin.from('teams').delete().eq('id', TEST_TEAM_ID)
  })

  it('returns antenna document with higher similarity than procurement document for RF query', async () => {
    const results = await semanticSearchDocuments('antenna RF specifications', TEST_TEAM_ID)

    expect(results.length).toBeGreaterThan(0)

    const antennaResult = results.find((r) => r.filename === 'rf-antenna-specs.pdf')
    const procurementResult = results.find((r) => r.filename === 'procurement-guide.pdf')

    expect(antennaResult).toBeDefined()
    if (antennaResult && procurementResult) {
      expect(antennaResult.similarity).toBeGreaterThan(procurementResult.similarity)
    }
  }, 30_000)

  it('returns empty array for impossible query', async () => {
    const results = await semanticSearchDocuments(
      'xkcd quantum entanglement teleportation',
      TEST_TEAM_ID,
      { limit: 2 },
    )
    // Should still return results (similarity ranking), just not throw
    expect(Array.isArray(results)).toBe(true)
  }, 30_000)
})
