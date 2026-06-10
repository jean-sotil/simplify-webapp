'use client'

import { useState } from 'react'
import { searchDocumentsAction } from '@/app/[lang]/documents/search/actions'
import type { SemanticSearchResult } from '@/lib/search/semantic'
import type { SelectedDocument } from '@/lib/validation/schemas'

export interface EttDocument {
  id: string
  filename: string
  url: string
}

interface DocumentSelectorProps {
  /**
   * When provided, the selector operates in analysis mode: it displays the ETT
   * context banner, pre-fills the query with the ETT filename, and scopes
   * search results to hardware documents only.
   *
   * When absent, the selector operates in freeform search mode — no type
   * scoping and no analysis trigger.
   */
  ettDocument?: EttDocument
  onRunAnalysis?: (selected: SelectedDocument[]) => void
}

export function DocumentSelector({ ettDocument, onRunAnalysis }: DocumentSelectorProps) {
  const [query, setQuery] = useState(ettDocument?.filename ?? '')
  const [results, setResults] = useState<SemanticSearchResult[]>([])
  const [selected, setSelected] = useState<Map<string, SemanticSearchResult>>(new Map())
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'done' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setSearchStatus('searching')
    setErrorMessage('')

    // When operating in analysis mode (ettDocument present), scope search to
    // hardware documents only — the ETT drives the query and hardware PDFs are
    // the matching corpus. In freeform mode, search across all document types.
    const result = await searchDocumentsAction(query, ettDocument ? 'hardware' : undefined)
    if (result.error) {
      setSearchStatus('error')
      setErrorMessage(result.error)
    } else {
      setResults(result.data ?? [])
      setSearchStatus('done')
    }
  }

  function toggleSelection(doc: SemanticSearchResult) {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(doc.id)) {
        next.delete(doc.id)
      } else {
        next.set(doc.id, doc)
      }
      return next
    })
  }

  function handleRunAnalysis() {
    // SemanticSearchResult does not carry the blob URL — the server action
    // resolves the real original_file_url from the documents table using the
    // document id before forwarding to n8n. An empty string is the accepted
    // placeholder per SelectedDocumentSchema.
    const hardwareDocs: SelectedDocument[] = Array.from(selected.values()).map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      url: '',
      documentType: 'hardware' as const,
      relatedRequirements: [],
    }))

    if (ettDocument) {
      // Analysis mode: the ETT document is always the first entry so n8n
      // knows which document drives the analysis.
      const ettEntry: SelectedDocument = {
        id: ettDocument.id,
        filename: ettDocument.filename,
        url: ettDocument.url,
        documentType: 'ett',
        relatedRequirements: [],
      }
      onRunAnalysis?.([ettEntry, ...hardwareDocs])
    } else {
      onRunAnalysis?.(hardwareDocs)
    }
  }

  const resultCount = results.length
  const selectedCount = selected.size

  return (
    <div>
      {/* ETT context banner — only shown in analysis mode */}
      {ettDocument && (
        <div
          className="mb-6 rounded-md px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--color-accent-blue)', color: '#fff' }}
          role="note"
          aria-label="ETT document driving this analysis"
        >
          <span className="font-medium">ETT: </span>
          {ettDocument.filename}
        </div>
      )}

      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-6">
        <label
          htmlFor="filter-docs"
          className="block text-xs font-medium uppercase tracking-[1.5px] mb-2"
          style={{ color: 'var(--color-mute)' }}
        >
          {ettDocument ? 'Search hardware documents' : 'Search query'}
        </label>
        <input
          id="filter-docs"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ettDocument ? 'Search by requirement or keyword…' : "Describe what you're looking for…"}
          className="w-full border rounded-sm px-4 py-2 text-sm focus:outline-none mb-3"
          style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        />
        <p id="search-hint" className="text-xs mb-3" style={{ color: 'var(--color-mute)' }}>
          {ettDocument
            ? 'Results are hardware inventory PDFs ranked by similarity to your query. The ETT document above is always included in the analysis.'
            : "Describe what you’re looking for. Results are ranked by semantic similarity."}
        </p>
        <button
          type="submit"
          disabled={!query.trim() || searchStatus === 'searching'}
          className="rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          aria-busy={searchStatus === 'searching'}
        >
          {searchStatus === 'searching'
            ? 'Searching…'
            : ettDocument
              ? 'Search hardware documents'
              : 'Search documents'}
        </button>
      </form>

      {/* Error feedback */}
      {searchStatus === 'error' && (
        <p
          role="alert"
          aria-live="assertive"
          className="mb-4 text-xs"
          style={{ color: 'var(--color-accent-red)' }}
        >
          {errorMessage}
        </p>
      )}

      {/* Results list */}
      {searchStatus === 'done' && (
        <section aria-labelledby="results-heading">
          <h2
            id="results-heading"
            className="text-xs font-medium uppercase tracking-[1.5px] mb-3"
            style={{ color: 'var(--color-mute)' }}
          >
            {ettDocument ? 'Hardware matches' : 'Results'}
          </h2>
          <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {resultCount === 0
              ? ettDocument ? 'No hardware documents found.' : 'No documents found.'
              : ettDocument
                ? `${resultCount} hardware document${resultCount === 1 ? '' : 's'} found.`
                : `${resultCount} document${resultCount === 1 ? '' : 's'} found.`}
          </p>

          {resultCount === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--color-mute)' }}>
              {ettDocument
                ? 'No hardware documents matched your query.'
                : 'No documents matched your query.'}
            </p>
          ) : (
            <ul
              className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-2 mb-6"
              style={{ borderColor: 'var(--color-hairline)' }}
            >
              {results.map((doc) => {
                const isSelected = selected.has(doc.id)
                return (
                  <li key={doc.id}>
                    <label className="flex items-center gap-3 px-3 py-2 rounded-sm cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(doc)}
                        aria-label={`Select ${doc.filename}`}
                        className="shrink-0"
                      />
                      <span
                        className="flex-1 text-sm min-w-0 break-all leading-tight"
                        style={{ color: 'var(--color-ink)' }}
                        title={doc.filename}
                      >
                        {doc.filename}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {/* Run analysis button */}
      {selectedCount > 0 && (
        <div
          className="border rounded-md p-4"
          style={{ borderColor: 'var(--color-hairline)' }}
        >
          <h2
            id="selected-heading"
            className="text-xs font-medium uppercase tracking-[1.5px] mb-2"
            style={{ color: 'var(--color-mute)' }}
          >
            {ettDocument ? `Selected hardware (${selectedCount})` : `Selected (${selectedCount})`}
          </h2>
          <ul className="space-y-1 mb-4">
            {Array.from(selected.values()).map((doc) => (
              <li key={doc.id} className="text-sm" style={{ color: 'var(--color-ink)' }}>
                {doc.filename}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleRunAnalysis}
            className="rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            {ettDocument
              ? `Run analysis with ${selectedCount} hardware document${selectedCount === 1 ? '' : 's'}`
              : `Run analysis with ${selectedCount} document${selectedCount === 1 ? '' : 's'}`}
          </button>
        </div>
      )}
    </div>
  )
}
