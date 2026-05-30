# Corrected Implementation Guide
## Semantic Search → Manual Selection → n8n Analysis → ZIP Output

---

## Architecture Summary

### **What Happens in Next.js (Web App)**
1. User uploads documents → stored with embeddings
2. User enters project + attaches ETT
3. User **manually queries** for related documents (semantic search)
4. User **reviews and selects** which documents to include
5. User clicks "Run Analysis"
6. App sends **only selected documents** to n8n
7. App waits for n8n response with ZIP file URL
8. User downloads ZIP with annotated PDFs

### **What Happens in n8n (Workflow)**
1. Receive selected documents + project metadata
2. Download each PDF from Vercel Blob
3. Run Python to identify matching sections
4. Annotate/highlight those sections in PDFs
5. Create ZIP file with all annotated PDFs + manifest
6. Upload ZIP to Vercel Blob
7. Send ZIP URL back to Next.js via webhook

---

## Server Actions (No LLM in Next.js)

### 1. Semantic Search (No Requirements Extraction)

```typescript
// src/lib/search/semantic.ts

import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '@/lib/ai/openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Search documents by semantic similarity
 * Input: Natural language query (e.g., "antenna specifications")
 * Output: Ranked list of documents with similarity scores
 */
export async function semanticSearchDocuments(
  query: string,
  teamId: string,
  documentType?: 'ett' | 'hardware',
  limit: number = 10
) {
  try {
    // 1. Generate embedding for user's query
    const queryEmbedding = await generateEmbedding(query)

    // 2. Call Supabase function to find similar documents
    const { data, error } = await supabase.rpc('search_documents_semantic', {
      query_embedding: queryEmbedding,
      team_id_param: teamId,
      doc_type_filter: documentType || null,
      match_count: limit,
    })

    if (error) {
      console.error('Search error:', error)
      throw error
    }

    // 3. Return results with similarity scores
    return data.map((doc: any) => ({
      id: doc.id,
      filename: doc.filename,
      documentType: doc.document_type,
      similarity: doc.similarity, // 0-1 score
      uploadedAt: doc.uploaded_at,
    }))
  } catch (error) {
    console.error('Failed to search documents:', error)
    return []
  }
}
```

### 2. Trigger Analysis with Selected Documents

```typescript
// src/app/[lang]/projects/[id]/analysis/actions.ts

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { getUser } from '@/lib/auth'
import { triggerN8nWorkflow } from '@/lib/n8n/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SelectedDocument {
  id: string
  filename: string
  originalFileUrl: string
  documentType: 'ett' | 'hardware'
}

/**
 * Trigger analysis workflow in n8n
 * - User has already selected which documents to analyze
 * - This action sends those documents to n8n
 * - n8n handles PDF annotation and ZIP creation
 */
export async function triggerAnalysis(
  projectId: string,
  selectedDocuments: SelectedDocument[]
) {
  const user = await getUser()
  if (!user) throw new Error('Not authenticated')

  if (selectedDocuments.length === 0) {
    throw new Error('No documents selected for analysis')
  }

  // 1. Fetch project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, team_id')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    throw new Error('Project not found')
  }

  // 2. Verify user has access to this project
  const { data: userData } = await supabase
    .from('auth.users')
    .select('team_id')
    .eq('id', user.id)
    .single()

  if (userData.team_id !== project.team_id) {
    throw new Error('Unauthorized: not your team')
  }

  // 3. Create analysis record (status: processing)
  const { data: analysisResult, error: analysisError } = await supabase
    .from('analysis_results')
    .insert({
      project_id: projectId,
      selected_documents: selectedDocuments, // Store user's selection
      status: 'processing',
    })
    .select()
    .single()

  if (analysisError) {
    throw new Error(`Failed to create analysis record: ${analysisError.message}`)
  }

  // 4. Link analysis to project
  await supabase
    .from('projects')
    .update({
      analysis_results_id: analysisResult.id,
      updated_at: new Date(),
    })
    .eq('id', projectId)

  // 5. Send to n8n (selected documents only)
  try {
    await triggerN8nWorkflow({
      projectId,
      projectName: project.name,
      analysisId: analysisResult.id,
      selectedDocuments, // ← Only documents user selected
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`,
    })
  } catch (n8nError) {
    // If n8n fails, mark analysis as failed
    await supabase
      .from('analysis_results')
      .update({
        status: 'failed',
        error_message: `n8n trigger failed: ${n8nError}`,
      })
      .eq('id', analysisResult.id)

    throw new Error(`Failed to trigger analysis: ${n8nError}`)
  }

  // 6. Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'triggered',
    resource_type: 'analysis',
    resource_id: analysisResult.id,
    changes: {
      document_count: selectedDocuments.length,
      documents: selectedDocuments.map((d) => d.filename),
    },
  })

  revalidatePath(`/[lang]/projects/${projectId}`, 'page')

  return {
    analysisId: analysisResult.id,
    status: 'processing',
    message: `Analysis started for ${selectedDocuments.length} documents`,
  }
}
```

### 3. Webhook Receiver (from n8n)

```typescript
// src/app/api/webhooks/n8n/route.ts

import { createClient } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Receives analysis results from n8n
 * - ZIP file URL
 * - Metadata about what was processed
 * - Status (completed or failed)
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()

    const { analysisId, projectId, zipFileUrl, status, error, metadata } =
      payload

    if (!analysisId || !projectId) {
      return NextResponse.json(
        { error: 'Missing analysisId or projectId' },
        { status: 400 }
      )
    }

    if (status === 'completed' && zipFileUrl) {
      // Success: Store ZIP URL and metadata
      const { error: updateError } = await supabase
        .from('analysis_results')
        .update({
          zip_file_url: zipFileUrl, // ← Main output
          analysis_metadata: metadata || {},
          status: 'completed',
          completed_at: new Date(),
        })
        .eq('id', analysisId)

      if (updateError) {
        console.error('Failed to update analysis:', updateError)
        return NextResponse.json(
          { error: 'Failed to store results' },
          { status: 500 }
        )
      }

      // Revalidate project page so UI refreshes
      revalidateTag(`project-${projectId}`)

      return NextResponse.json({
        success: true,
        message: 'Analysis results stored',
      })
    } else if (status === 'failed') {
      // Failure: Store error message
      const { error: updateError } = await supabase
        .from('analysis_results')
        .update({
          status: 'failed',
          error_message: error || 'Unknown error',
        })
        .eq('id', analysisId)

      if (updateError) {
        console.error('Failed to update analysis:', updateError)
      }

      revalidateTag(`project-${projectId}`)

      return NextResponse.json({
        success: true,
        message: 'Analysis marked as failed',
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid status or missing zipFileUrl' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## UI Components

### 1. Document Selector Component

```typescript
// src/components/analysis/DocumentSelector.tsx

'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { semanticSearchDocuments } from '@/lib/search/semantic'
import { triggerAnalysis } from '@/app/[lang]/projects/[id]/analysis/actions'
import { useTranslations } from 'next-intl'

interface Document {
  id: string
  filename: string
  documentType: 'ett' | 'hardware'
  similarity: number
}

interface DocumentSelectorProps {
  projectId: string
  teamId: string
  ettDocumentName?: string
}

export function DocumentSelector({
  projectId,
  teamId,
  ettDocumentName,
}: DocumentSelectorProps) {
  const t = useTranslations()
  const { pending } = useFormStatus()

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Document[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Selection state
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Step 1: User searches for documents
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()

    if (!searchQuery.trim()) {
      setSearchError('Please enter a search term')
      return
    }

    setIsSearching(true)
    setSearchError('')

    try {
      const results = await semanticSearchDocuments(
        searchQuery,
        teamId,
        undefined, // all document types
        10 // top 10 results
      )

      setSearchResults(results)

      if (results.length === 0) {
        setSearchError('No documents found matching your query')
      }
    } catch (error) {
      setSearchError('Search failed. Please try again.')
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Step 2: User selects/deselects documents
  function toggleDocument(doc: Document) {
    setSelectedDocuments((prev) =>
      prev.some((d) => d.id === doc.id)
        ? prev.filter((d) => d.id !== doc.id)
        : [...prev, doc]
    )
  }

  // Step 3: User submits selected documents for analysis
  async function handleRunAnalysis(e: React.FormEvent) {
    e.preventDefault()

    if (selectedDocuments.length === 0) {
      setSearchError('Please select at least one document')
      return
    }

    setIsAnalyzing(true)
    setSearchError('')

    try {
      const docPayload = selectedDocuments.map((doc) => ({
        id: doc.id,
        filename: doc.filename,
        originalFileUrl: doc.id, // ← This should come from database
        documentType: doc.documentType,
      }))

      const result = await triggerAnalysis(projectId, docPayload)
      alert(`✓ ${result.message}`)
      setSelectedDocuments([])
      setSearchQuery('')
      setSearchResults([])
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : 'Failed to start analysis'
      )
      console.error('Analysis error:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Search Section */}
      <div className="border rounded-lg p-6 bg-white">
        <h2 className="text-xl font-bold mb-4">
          {t('analysis.findRelatedDocuments')}
        </h2>

        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('analysis.searchHint')}
            </label>
            <textarea
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="E.g., 'Antenna RF specifications', 'Power consumption requirements'"
              className="w-full h-24 border border-gray-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              disabled={isSearching}
            />
          </div>

          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSearching ? `${t('common.searching')}...` : t('analysis.search')}
          </button>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold mb-4">
              {t('analysis.found')}: {searchResults.length} {t('analysis.documents')}
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {searchResults.map((doc) => (
                <label
                  key={doc.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={selectedDocuments.some((d) => d.id === doc.id)}
                    onChange={() => toggleDocument(doc)}
                    className="w-5 h-5 accent-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.filename}</p>
                    <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                      <span>
                        {t('analysis.type')}: {doc.documentType}
                      </span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                        {(doc.similarity * 100).toFixed(0)}% {t('analysis.match')}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {searchError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {searchError}
          </div>
        )}
      </div>

      {/* Selected Documents Preview & Submit */}
      <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <h2 className="text-xl font-bold mb-4">
          {t('analysis.selectedDocuments')} ({selectedDocuments.length})
        </h2>

        {selectedDocuments.length === 0 ? (
          <p className="text-gray-600 py-8 text-center">
            {t('analysis.noDocsSelected')}
          </p>
        ) : (
          <>
            <ul className="space-y-2 mb-6">
              {selectedDocuments.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200"
                >
                  <div>
                    <p className="font-medium">{doc.filename}</p>
                    <p className="text-xs text-gray-600">
                      {doc.documentType} • {(doc.similarity * 100).toFixed(0)}%
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleDocument(doc)}
                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            <form onSubmit={handleRunAnalysis}>
              <button
                type="submit"
                disabled={isAnalyzing || selectedDocuments.length === 0}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition"
              >
                {isAnalyzing
                  ? `⏳ ${t('analysis.analyzing')}...`
                  : `🚀 ${t('analysis.runAnalysis')} (${selectedDocuments.length})`}
              </button>
            </form>

            <p className="text-xs text-gray-600 mt-3 text-center">
              {t('analysis.hint')}: You can re-run analysis with different documents anytime
            </p>
          </>
        )}
      </div>
    </div>
  )
}
```

### 2. Analysis Results Display

```typescript
// src/components/analysis/AnalysisResults.tsx

'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface AnalysisResult {
  id: string
  projectId: string
  zipFileUrl: string | null
  analysisMetadata: any
  status: 'pending' | 'processing' | 'completed' | 'failed'
  errorMessage: string | null
  completedAt: string | null
}

interface AnalysisResultsProps {
  analysis: AnalysisResult
  onRefresh: () => void
}

export function AnalysisResults({
  analysis,
  onRefresh,
}: AnalysisResultsProps) {
  const t = useTranslations()
  const [autoRefreshCount, setAutoRefreshCount] = useState(0)

  // Auto-refresh if still processing
  useEffect(() => {
    if (analysis.status === 'processing') {
      const timer = setTimeout(() => {
        setAutoRefreshCount((c) => c + 1)
        onRefresh()
      }, 5000) // Check every 5 seconds

      return () => clearTimeout(timer)
    }
  }, [analysis.status, onRefresh])

  if (analysis.status === 'pending' || analysis.status === 'processing') {
    return (
      <div className="border rounded-lg p-6 bg-blue-50 text-center space-y-4">
        <div className="animate-spin text-4xl">⏳</div>
        <h2 className="text-xl font-bold">{t('analysis.analyzing')}...</h2>
        <p className="text-gray-600">
          {t('analysis.processingDocuments')} 
          {autoRefreshCount > 0 && ` (checked ${autoRefreshCount} times)`}
        </p>
        <div className="flex justify-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-100"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-200"></div>
        </div>
      </div>
    )
  }

  if (analysis.status === 'failed') {
    return (
      <div className="border rounded-lg p-6 bg-red-50">
        <h2 className="text-xl font-bold text-red-800">❌ {t('analysis.failed')}</h2>
        <p className="text-red-700 mt-2">{analysis.errorMessage || t('common.error')}</p>
      </div>
    )
  }

  if (analysis.status === 'completed' && analysis.zipFileUrl) {
    return (
      <div className="border rounded-lg p-6 bg-green-50 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-green-800">
            ✅ {t('analysis.completed')}
          </h2>
          <p className="text-green-700 mt-2">
            {t('analysis.docsProcessed')}: {analysis.analysisMetadata?.documentCount || 'N/A'}
          </p>
        </div>

        <div className="space-y-3 bg-white p-4 rounded-lg">
          <h3 className="font-semibold">{t('analysis.zipContains')}:</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
            <li>{t('analysis.annotatedPdfs')}</li>
            <li>{t('analysis.manifestFile')}</li>
            <li>{t('analysis.readyForReview')}</li>
          </ul>
        </div>

        <a
          href={analysis.zipFileUrl}
          download
          className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold text-lg transition"
        >
          📥 {t('analysis.downloadZip')}
        </a>

        {analysis.analysisMetadata && (
          <div className="text-xs text-gray-600 border-t pt-4 space-y-1">
            <p>
              {t('common.generated')}:{' '}
              {new Date(analysis.completedAt).toLocaleString()}
            </p>
            <p>
              {t('analysis.documents')}: {analysis.analysisMetadata.documentCount}
            </p>
            {analysis.analysisMetadata.totalPages && (
              <p>
                {t('analysis.pages')}: {analysis.analysisMetadata.totalPages}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6 bg-gray-50">
      <p className="text-gray-600">{t('analysis.noResults')}</p>
    </div>
  )
}
```

---

## n8n Workflow Payload

### What Next.js Sends to n8n

```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "projectName": "Project Alpha",
  "analysisId": "660e8400-e29b-41d4-a716-446655440000",
  "selectedDocuments": [
    {
      "id": "doc-uuid-1",
      "filename": "hardware-inventory.pdf",
      "originalFileUrl": "https://blob.vercelusercontent.com/...xyz...",
      "documentType": "hardware"
    },
    {
      "id": "doc-uuid-2",
      "filename": "antenna-specification-ett.pdf",
      "originalFileUrl": "https://blob.vercelusercontent.com/...abc...",
      "documentType": "ett"
    }
  ],
  "webhookUrl": "https://app.example.com/api/webhooks/n8n"
}
```

### What n8n Sends Back to Next.js

```json
{
  "analysisId": "660e8400-e29b-41d4-a716-446655440000",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "zipFileUrl": "https://blob.vercelusercontent.com/analysis-results-xyz.zip",
  "status": "completed",
  "metadata": {
    "documentCount": 2,
    "totalPages": 47,
    "annotatedSections": [
      {
        "documentId": "doc-uuid-1",
        "filename": "hardware-inventory.pdf",
        "pagesAnnotated": [3, 5, 12],
        "sectionsHighlighted": 5
      },
      {
        "documentId": "doc-uuid-2",
        "filename": "antenna-specification-ett.pdf",
        "pagesAnnotated": [1, 2, 8, 15],
        "sectionsHighlighted": 8
      }
    ],
    "generatedAt": "2025-01-15T14:30:00Z"
  }
}
```

---

## Translation Keys (for i18n)

```json
{
  "analysis": {
    "findRelatedDocuments": "Find Related Documents",
    "searchHint": "Enter a requirement or search term",
    "search": "Search Documents",
    "found": "Found",
    "documents": "documents",
    "type": "Type",
    "match": "match",
    "selectedDocuments": "Selected Documents",
    "noDocsSelected": "No documents selected yet",
    "runAnalysis": "Run Analysis",
    "analyzing": "Analyzing",
    "processingDocuments": "Processing your documents...",
    "completed": "Analysis Complete",
    "failed": "Analysis Failed",
    "docsProcessed": "Documents processed",
    "zipContains": "What's in the ZIP file:",
    "annotatedPdfs": "Annotated PDFs with highlighted requirement matches",
    "manifestFile": "Manifest file with analysis metadata",
    "readyForReview": "Ready for review and team distribution",
    "downloadZip": "Download Annotated PDFs (ZIP)",
    "noResults": "No analysis results available yet"
  }
}
```

---

## Summary: What Changed

| Component | Old | New |
|-----------|-----|-----|
| **Requirement Extraction** | Next.js + GPT-4 | Removed (not needed) |
| **Document Discovery** | Automatic + hidden | User-driven semantic search |
| **Document Selection** | Automatic (all docs) | Manual (checkbox selection) |
| **Analysis Trigger** | Extract → match → send | Send selected docs only |
| **PDF Processing** | Not implemented | n8n + Python |
| **Output** | Text report | ZIP with annotated PDFs |
| **User Control** | Low (automatic) | High (curate documents) |

---

## Key Improvements

✅ **Simpler Architecture**: No LLM in webapp  
✅ **Better UX**: User controls what gets analyzed  
✅ **Tangible Output**: ZIP file with annotated PDFs (not abstract report)  
✅ **Clear Responsibility**: Next.js = discovery, n8n = processing  
✅ **Easier to Debug**: Each component has single responsibility  
✅ **Scalable**: Can handle 100+ documents per project  

This is much cleaner! 🎯
