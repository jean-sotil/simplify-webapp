# Revised Architecture: Analysis Workflow
## Docs Analysis Platform — Corrected Flow

---

## Updated Flow (Correct)

### **Phase 1: Document Upload & Semantic Indexing (Next.js)**

```
User uploads PDF (ETT or Hardware)
    ↓
Next.js Server Action:
  1. Upload to Vercel Blob (original file)
  2. Extract text via PyPDF
  3. Generate embedding via OpenAI
  4. Store metadata + embedding in Supabase
    ↓
Document now queryable via semantic search
```

---

### **Phase 2: Project Setup & Document Discovery (Next.js)**

```
User creates project
    ↓
User attaches ETT document to project
    ↓
User moves project to "Docs Analysis" stage
    ↓
User sees: "Select documents for analysis"
    ↓
System shows:
  - Semantic search input field
  - "Find related documents" button
    ↓
User enters queries (one per requirement manually, OR system extracts)
    ↓
System returns ranked list of related documents
    ↓
User REVIEWS and SELECTS which ones to include
```

---

### **Phase 3: Trigger Analysis with Selected Documents (Next.js → n8n)**

```
User clicks "Run Analysis with Selected Documents"
    ↓
Next.js Server Action:
  1. Fetch selected documents metadata
  2. Prepare payload:
     {
       projectId,
       projectName,
       ettDocumentUrl,
       selectedDocuments: [
         { id, filename, url, relatedRequirements }
       ],
       webhookUrl
     }
  3. Send to n8n webhook
    ↓
n8n receives payload
```

---

### **Phase 4: PDF Annotation & Packaging (n8n + Python)**

```
n8n workflow starts:
    ↓
[Step 1] Receive project data + selected document URLs
    ↓
[Step 2] For each selected document:
         - Download PDF from Vercel Blob
         - Store temporarily
    ↓
[Step 3] For each document, run Python script:
         - Open PDF with PyPDF2 / pdfplumber
         - Extract text content
         - Identify sections matching each requirement
         - Highlight/annotate those sections
         - Save annotated PDF
    ↓
[Step 4] Create ZIP file:
         - Include all annotated PDFs
         - Add manifest.json (metadata)
         - Compress
    ↓
[Step 5] Upload ZIP to Vercel Blob
    ↓
[Step 6] Send webhook back to Next.js:
         {
           analysisId,
           projectId,
           zipFileUrl,
           status: "completed",
           metadata: {
             documentCount,
             totalPages,
             requirements: [...]
           }
         }
```

---

### **Phase 5: Store Results & Display (Next.js)**

```
n8n webhook received by Next.js
    ↓
Next.js Server Action:
  1. Update analysis_results:
     - zipFileUrl
     - status: "completed"
     - completedAt
  2. Update projects:
     - analysis_results_id
    ↓
User visits project page
    ↓
User sees:
  - "Analysis Complete" status
  - "Download Annotated PDFs" button (links to ZIP)
  - List of documents in analysis
  - Summary of what was annotated
    ↓
User downloads ZIP
    ↓
User extracts and reviews PDFs locally
    ↓
(Optional) User can re-run analysis with different document selection
```

---

## Updated Data Models

### Analysis Results Table (Revised)

```sql
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  
  -- User-selected documents for this analysis
  selected_documents JSONB NOT NULL DEFAULT '[]',
  -- Example:
  -- [
  --   {
  --     "id": "doc-123",
  --     "filename": "hardware-inventory.pdf",
  --     "url": "https://blob.vercelusercontent.com/...",
  --     "document_type": "hardware"
  --   }
  -- ]
  
  -- Output from n8n
  zip_file_url TEXT,  -- URL to the ZIP containing annotated PDFs
  
  -- Metadata from n8n
  analysis_metadata JSONB,
  -- Example:
  -- {
  --   "document_count": 3,
  --   "total_pages": 45,
  --   "annotated_sections": [
  --     {
  --       "document_id": "doc-123",
  --       "requirement": "REQ-001",
  --       "page": 5,
  --       "section": "Hardware specifications"
  --     }
  --   ]
  -- }
  
  triggered_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  status TEXT DEFAULT 'pending',
  -- pending | processing | completed | failed
  
  error_message TEXT
);
```

---

## Component: Document Discovery & Selection

### User Flow

```typescript
// src/components/analysis/DocumentSelector.tsx

'use client'

import { useState } from 'react'
import { semanticSearchDocuments } from '@/lib/search/semantic'
import { triggerAnalysis } from '@/app/[lang]/projects/[id]/analysis/actions'

interface DocumentSelectorProps {
  projectId: string
  teamId: string
}

export function DocumentSelector({
  projectId,
  teamId,
}: DocumentSelectorProps) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Document[]>([])
  const [selectedDocs, setSelectedDocs] = useState<Document[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Step 1: User types a query (requirement description)
  async function handleSearch() {
    setIsSearching(true)
    try {
      // Semantic search returns ranked documents
      const results = await semanticSearchDocuments(query, teamId, 10)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Step 2: User selects documents
  function toggleDocumentSelection(doc: Document) {
    setSelectedDocs((prev) =>
      prev.find((d) => d.id === doc.id)
        ? prev.filter((d) => d.id !== doc.id)
        : [...prev, doc]
    )
  }

  // Step 3: User clicks "Run Analysis"
  async function handleRunAnalysis() {
    if (selectedDocs.length === 0) {
      alert('Please select at least one document')
      return
    }

    setIsAnalyzing(true)
    try {
      // Send selected documents to n8n via Server Action
      await triggerAnalysis(projectId, selectedDocs)
      alert('Analysis started! You will receive a notification when complete.')
    } catch (error) {
      console.error('Analysis trigger failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Search Section */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Find Related Documents</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Enter a requirement or search term:
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., 'Antenna specifications for RF module'"
              className="w-full h-24 border rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={isSearching || !query}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search Documents'}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="font-semibold">Found {searchResults.length} matching documents:</h3>
            <ul className="space-y-2">
              {searchResults.map((doc) => (
                <li
                  key={doc.id}
                  className="p-3 border rounded hover:bg-gray-50 flex items-center gap-3"
                >
                  <input
                    type="checkbox"
                    checked={selectedDocs.some((d) => d.id === doc.id)}
                    onChange={() => toggleDocumentSelection(doc)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{doc.filename}</p>
                    <p className="text-sm text-gray-600">
                      Type: {doc.document_type} | Similarity: {(doc.similarity * 100).toFixed(0)}%
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Selected Documents Section */}
      <div className="border rounded-lg p-6 bg-blue-50">
        <h2 className="text-xl font-bold mb-4">
          Selected Documents ({selectedDocs.length})
        </h2>

        {selectedDocs.length === 0 ? (
          <p className="text-gray-600">No documents selected yet</p>
        ) : (
          <ul className="space-y-2 mb-6">
            {selectedDocs.map((doc) => (
              <li
                key={doc.id}
                className="p-3 bg-white rounded border flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{doc.filename}</p>
                  <p className="text-sm text-gray-600">{doc.document_type}</p>
                </div>
                <button
                  onClick={() => toggleDocumentSelection(doc)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing || selectedDocs.length === 0}
          className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-lg"
        >
          {isAnalyzing
            ? 'Analyzing... (check back soon)'
            : `Run Analysis (${selectedDocs.length} docs)`}
        </button>
      </div>
    </div>
  )
}
```

---

## Updated Server Action: Trigger Analysis

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

export async function triggerAnalysis(
  projectId: string,
  selectedDocuments: Array<{
    id: string
    filename: string
    originalFileUrl: string
    documentType: string
  }>
) {
  const user = await getUser()
  if (!user) throw new Error('Not authenticated')

  // 1. Fetch project metadata
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .single()

  if (!project) throw new Error('Project not found')

  // 2. Get user's team
  const { data: userData } = await supabase
    .from('auth.users')
    .select('team_id')
    .eq('id', user.id)
    .single()

  // 3. Create analysis record (status: pending)
  const { data: analysisResult, error: analysisError } = await supabase
    .from('analysis_results')
    .insert({
      project_id: projectId,
      selected_documents: selectedDocuments,
      status: 'processing',
    })
    .select()
    .single()

  if (analysisError) throw analysisError

  // 4. Update project with analysis reference
  await supabase
    .from('projects')
    .update({ analysis_results_id: analysisResult.id })
    .eq('id', projectId)

  // 5. Trigger n8n workflow
  // Pass ONLY the selected documents, not all documents in the project
  await triggerN8nWorkflow({
    projectId,
    projectName: project.name,
    analysisId: analysisResult.id,
    selectedDocuments, // ← User-selected documents only
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`,
  })

  // 6. Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'triggered',
    resource_type: 'analysis',
    resource_id: analysisResult.id,
    changes: { document_count: selectedDocuments.length },
  })

  revalidatePath(`/[lang]/projects/${projectId}`, 'page')
  return analysisResult
}
```

---

## Updated n8n Webhook Payload

```typescript
// What Next.js sends to n8n

{
  "projectId": "proj-123",
  "projectName": "Project Alpha",
  "analysisId": "analysis-456",
  "selectedDocuments": [
    {
      "id": "doc-1",
      "filename": "hardware-inventory.pdf",
      "originalFileUrl": "https://blob.vercelusercontent.com/xyz",
      "documentType": "hardware"
    },
    {
      "id": "doc-2",
      "filename": "antenna-spec.pdf",
      "originalFileUrl": "https://blob.vercelusercontent.com/abc",
      "documentType": "ett"
    }
  ],
  "webhookUrl": "https://app.example.com/api/webhooks/n8n"
}
```

---

## n8n Workflow (Pseudo-code)

```json
{
  "name": "PDF Document Analysis & Annotation",
  "nodes": [
    {
      "name": "Webhook",
      "type": "webhook",
      "operation": "listen",
      "path": "/webhook/analysis"
    },
    {
      "name": "Extract Variables",
      "type": "setNode",
      "operation": "setVariable",
      "variables": {
        "projectId": "{{ $json.projectId }}",
        "analysisId": "{{ $json.analysisId }}",
        "selectedDocuments": "{{ $json.selectedDocuments }}",
        "webhookUrl": "{{ $json.webhookUrl }}"
      }
    },
    {
      "name": "Loop Documents",
      "type": "loop",
      "operation": "forEach",
      "list": "{{ $variables.selectedDocuments }}",
      "nodes": [
        {
          "name": "Download PDF",
          "type": "http",
          "operation": "request",
          "method": "GET",
          "url": "{{ $item().originalFileUrl }}",
          "responseType": "arraybuffer"
        },
        {
          "name": "Run Python Annotation",
          "type": "code",
          "operation": "executeCode",
          "language": "python",
          "code": `
import PyPDF2
import pdfplumber
from io import BytesIO
import json

# Input: PDF binary + document metadata
pdf_binary = {{ $item().pdf_data }}
doc_metadata = {{ $item() }}

# Parse PDF
pdf_file = BytesIO(pdf_binary)
pdf_reader = PyPDF2.PdfReader(pdf_file)

# Extract text from each page
all_pages_text = []
for page_num, page in enumerate(pdf_reader.pages):
    text = page.extract_text()
    all_pages_text.append({
      "page": page_num + 1,
      "text": text
    })

# Identify sections for annotation
# (This is where you'd use regex or keyword matching)
# For now, simple example:
annotated_sections = []
for page_data in all_pages_text:
    if "requirement" in page_data["text"].lower():
        annotated_sections.append({
          "page": page_data["page"],
          "section": "Found requirement mention"
        })

# Add annotations to PDF (using PyPDF2 or reportlab)
# (Simplified: in reality, you'd use reportlab to draw rectangles/highlights)
output_pdf = BytesIO()
pdf_writer = PyPDF2.PdfWriter()

for page_num, page in enumerate(pdf_reader.pages):
    pdf_writer.add_page(page)
    # Add annotation to page (simplified)

# Return annotated PDF
return {
  "annotated_pdf": output_pdf.getvalue(),
  "annotated_sections": annotated_sections,
  "filename": doc_metadata.filename
}
          `
        },
        {
          "name": "Upload Annotated PDF",
          "type": "http",
          "operation": "request",
          "method": "POST",
          "url": "https://api.vercel.com/v1/blob/upload",
          "headers": {
            "Authorization": "Bearer {{ $env.VERCEL_BLOB_TOKEN }}"
          },
          "body": "{{ $node['Run Python Annotation'].json.annotated_pdf }}",
          "bodyType": "binary"
        }
      ]
    },
    {
      "name": "Create ZIP File",
      "type": "code",
      "operation": "executeCode",
      "language": "python",
      "code": `
import zipfile
from io import BytesIO

# Collect all annotated PDFs
annotated_pdfs = {{ $node['Loop Documents'].json }}

# Create ZIP
zip_buffer = BytesIO()
with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
    for pdf_data in annotated_pdfs:
        zf.writestr(pdf_data['filename'], pdf_data['annotated_pdf'])
    
    # Add manifest
    manifest = {
      "projectId": "{{ $variables.projectId }}",
      "analysisId": "{{ $variables.analysisId }}",
      "documentCount": len(annotated_pdfs),
      "generatedAt": new Date().toISOString()
    }
    zf.writestr("manifest.json", JSON.stringify(manifest))

return {
  "zip_file": zip_buffer.getvalue(),
  "size": zip_buffer.tell()
}
      `
    },
    {
      "name": "Upload ZIP to Vercel Blob",
      "type": "http",
      "operation": "request",
      "method": "POST",
      "url": "https://api.vercel.com/v1/blob/upload",
      "headers": {
        "Authorization": "Bearer {{ $env.VERCEL_BLOB_TOKEN }}"
      },
      "body": "{{ $node['Create ZIP File'].json.zip_file }}",
      "bodyType": "binary"
    },
    {
      "name": "Send Webhook Response",
      "type": "http",
      "operation": "request",
      "method": "POST",
      "url": "{{ $variables.webhookUrl }}",
      "body": {
        "analysisId": "{{ $variables.analysisId }}",
        "projectId": "{{ $variables.projectId }}",
        "zipFileUrl": "{{ $node['Upload ZIP to Vercel Blob'].json.url }}",
        "status": "completed",
        "metadata": {
          "documentCount": "{{ $node['Loop Documents'].json.length }}",
          "totalPages": "{{ sum of all pages }}",
          "generatedAt": "{{ now() }}"
        }
      }
    }
  ]
}
```

---

## Updated Webhook Receiver (Next.js)

```typescript
// src/app/api/webhooks/n8n/route.ts

import { createClient } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const payload = await req.json()

  const { analysisId, projectId, zipFileUrl, status, error, metadata } = payload

  if (status === 'completed') {
    // Store the ZIP file URL and metadata
    await supabase
      .from('analysis_results')
      .update({
        zip_file_url: zipFileUrl, // ← This is the downloadable ZIP
        analysis_metadata: metadata,
        status: 'completed',
        completed_at: new Date(),
      })
      .eq('id', analysisId)
  } else if (status === 'failed') {
    await supabase
      .from('analysis_results')
      .update({
        status: 'failed',
        error_message: error,
      })
      .eq('id', analysisId)
  }

  // Revalidate project page
  revalidateTag(`project-${projectId}`)

  return NextResponse.json({ success: true })
}
```

---

## Analysis Results Display Component

```typescript
// src/components/analysis/AnalysisResults.tsx

'use client'

export function AnalysisResults({ analysis }: { analysis: AnalysisResult }) {
  if (!analysis.zip_file_url) {
    return <div>Analysis not yet complete. Check back soon.</div>
  }

  return (
    <div className="space-y-6 border rounded-lg p-6 bg-green-50">
      <div>
        <h2 className="text-2xl font-bold text-green-800">✓ Analysis Complete</h2>
        <p className="text-green-700 mt-2">
          {analysis.analysis_metadata?.document_count || 'N/A'} documents processed
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">What's in the ZIP file:</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Annotated PDFs with highlighted requirement matches</li>
          <li>Manifest file with analysis metadata</li>
          <li>Ready for review and distribution to your team</li>
        </ul>
      </div>

      <a
        href={analysis.zip_file_url}
        download
        className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
      >
        📥 Download Annotated PDFs (ZIP)
      </a>

      {analysis.analysis_metadata && (
        <div className="text-sm text-gray-600 border-t pt-4">
          <p>Generated: {new Date(analysis.completed_at).toLocaleString()}</p>
          <p>Documents: {analysis.analysis_metadata.document_count}</p>
        </div>
      )}
    </div>
  )
}
```

---

## Key Changes Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Requirement Extraction** | In Next.js (GPT-4) | Removed from webapp |
| **Document Discovery** | Automatic semantic search | Manual semantic search + user selection |
| **Analysis Input** | All documents in project | User-selected documents only |
| **Analysis Output** | Text report | ZIP file with annotated PDFs |
| **PDF Annotation** | Not implemented | n8n + Python handles highlighting |
| **n8n Responsibility** | Minimal (just collect data) | Heavy: download, annotate, package PDFs |
| **User Control** | Limited (automatic) | Full (curate which documents to analyze) |

---

## Data Flow (Corrected)

```
[Next.js Web App]
       ↓
User enters search query
       ↓
Semantic search via embeddings
       ↓
Display ranked results
       ↓
User manually selects documents
       ↓
User clicks "Run Analysis"
       ↓
Send selected documents to n8n
       ↓
                ↓
       [n8n Workflow]
              ↓
       Download selected PDFs
              ↓
       Python: Annotate & highlight
              ↓
       Create ZIP file
              ↓
       Upload ZIP to Vercel Blob
              ↓
       Send ZIP URL back to Next.js
              ↓
[Next.js Web App]
       ↓
Store ZIP URL in database
       ↓
Display "Download Analysis" button
       ↓
User downloads ZIP with annotated PDFs
```

This is much cleaner and gives users full control over which documents get analyzed! 🎯
