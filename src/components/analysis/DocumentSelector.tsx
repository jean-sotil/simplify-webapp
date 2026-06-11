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
   * search results to the selected document type (hardware or software).
   *
   * When absent, the selector operates in freeform search mode -- no type
   * scoping and no analysis trigger.
   */
  ettDocument?: EttDocument
  onRunAnalysis?: (selected: SelectedDocument[]) => void
}

export function DocumentSelector({ ettDocument, onRunAnalysis }: DocumentSelectorProps) {
  const [query, setQuery] = useState(ettDocument?.filename ?? '')
  const [results, setResults] = useState<SemanticSearchResult[]>([])
  // Selected documents accumulate across searches (hardware + software)
  const [selected, setSelected] = useState<Map<string, SemanticSearchResult & { docType: string }>>(new Map())
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'done' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState<'hardware' | 'software'>('hardware')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setSearchStatus('searching')
    setErrorMessage('')

    const result = await searchDocumentsAction(query, ettDocument ? docTypeFilter : undefined)
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
        next.set(doc.id, { ...doc, docType: docTypeFilter })
      }
      return next
    })
  }

  function handleRunAnalysis() {
    const selectedDocs: SelectedDocument[] = Array.from(selected.values()).map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      url: '',
      documentType: doc.docType as 'hardware' | 'software',
      relatedRequirements: [],
    }))

    if (ettDocument) {
      const ettEntry: SelectedDocument = {
        id: ettDocument.id,
        filename: ettDocument.filename,
        url: ettDocument.url,
        documentType: 'ett',
        relatedRequirements: [],
      }
      onRunAnalysis?.([ettEntry, ...selectedDocs])
    } else {
      onRunAnalysis?.(selectedDocs)
    }
  }

  const resultCount = results.length
  const selectedCount = selected.size

  return (
    <div>
      {/* ETT context banner */}
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
        {/* Document type filter */}
        {ettDocument && (
          <div className="mb-4">
            <label
              className="block text-xs font-medium uppercase tracking-[1.5px] mb-2"
              style={{ color: 'var(--color-mute)' }}
            >
              Document type to compare
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDocTypeFilter('hardware')}
                className={`px-4 py-2 text-sm rounded-sm border font-medium transition-colors ${
                  docTypeFilter === 'hardware'
                    ? 'bg-[var(--color-accent-orange)] text-white border-transparent'
                    : 'border-[var(--color-hairline)] hover:opacity-70'
                }`}
                style={docTypeFilter !== 'hardware' ? { color: 'var(--color-ink)' } : undefined}
              >
                Hardware
              </button>
              <button
                type="button"
                onClick={() => setDocTypeFilter('software')}
                className={`px-4 py-2 text-sm rounded-sm border font-medium transition-colors ${
                  docTypeFilter === 'software'
                    ? 'bg-emerald-600 text-white border-transparent'
                    : 'border-[var(--color-hairline)] hover:opacity-70'
                }`}
                style={docTypeFilter !== 'software' ? { color: 'var(--color-ink)' } : undefined}
              >
                Software
              </button>
            </div>
          </div>
        )}
        <label
          htmlFor="filter-docs"
          className="block text-xs font-medium uppercase tracking-[1.5px] mb-2"
          style={{ color: 'var(--color-mute)' }}
        >
          {ettDocument ? `Search ${docTypeFilter} documents` : 'Search query'}
        </label>
        <input
          id="filter-docs"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ettDocument ? 'Search by requirement or keyword...' : "Describe what you're looking for..."}
          className="w-full border rounded-sm px-4 py-2 text-sm focus:outline-none mb-3"
          style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        />
        <p id="search-hint" className="text-xs mb-3" style={{ color: 'var(--color-mute)' }}>
          {ettDocument
            ? `Results are ${docTypeFilter} inventory PDFs ranked by similarity. Selected documents accumulate across searches.`
            : "Describe what you're looking for. Results are ranked by semantic similarity."}
        </p>
        <button
          type="submit"
          disabled={!query.trim() || searchStatus === 'searching'}
          className="rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          aria-busy={searchStatus === 'searching'}
        >
          {searchStatus === 'searching' ? 'Searching...' : 'Search documents'}
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
            {docTypeFilter} matches
          </h2>

          {resultCount === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--color-mute)' }}>
              No {docTypeFilter} documents matched your query.
            </p>
          ) : (
            <>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelected((prev) => {
                      const next = new Map(prev)
                      results.forEach((doc) => next.set(doc.id, { ...doc, docType: docTypeFilter }))
                      return next
                    })
                  }}
                  className="text-xs px-3 py-1 rounded-sm border hover:opacity-70"
                  style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelected((prev) => {
                      const next = new Map(prev)
                      results.forEach((doc) => next.delete(doc.id))
                      return next
                    })
                  }}
                  className="text-xs px-3 py-1 rounded-sm border hover:opacity-70"
                  style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-mute)' }}
                >
                  Deselect all
                </button>
              </div>
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
            </>
          )}
        </section>
      )}

      {/* Selected documents summary + run button */}
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
            Selected documents ({selectedCount})
          </h2>
          <ul className="space-y-1 mb-4">
            {Array.from(selected.values()).map((doc) => (
              <li key={doc.id} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-ink)' }}>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm ${
                    doc.docType === 'hardware'
                      ? 'bg-[var(--color-accent-orange)] text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {doc.docType === 'hardware' ? 'HW' : 'SW'}
                </span>
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
            Run analysis with {selectedCount} document{selectedCount === 1 ? '' : 's'}
          </button>
        </div>
      )}
    </div>
  )
}
