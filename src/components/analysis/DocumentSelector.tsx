'use client'

import { useState } from 'react'
import { searchDocumentsAction } from '@/app/[lang]/documents/search/actions'
import type { SemanticSearchResult } from '@/lib/search/semantic'
import type { SelectedDocument } from '@/lib/validation/schemas'

interface DocumentSelectorProps {
  onRunAnalysis?: (selected: SelectedDocument[]) => void
}

export function DocumentSelector({ onRunAnalysis }: DocumentSelectorProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SemanticSearchResult[]>([])
  const [selected, setSelected] = useState<Map<string, SemanticSearchResult>>(new Map())
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'done' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setSearchStatus('searching')
    setErrorMessage('')

    const result = await searchDocumentsAction(query)
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
    const selectedDocs: SelectedDocument[] = Array.from(selected.values()).map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      url: '',
      relatedRequirements: [],
    }))
    onRunAnalysis?.(selectedDocs)
  }

  const resultCount = results.length
  const selectedCount = selected.size

  return (
    <div>
      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-6">
        <label
          htmlFor="search-query"
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--color-ink)' }}
        >
          Search query
        </label>
        <textarea
          id="search-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          placeholder="e.g. antenna RF specifications, hardware power requirements…"
          className="w-full border rounded-sm px-4 py-3 text-sm resize-y focus:outline-none mb-3"
          style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
          aria-describedby="search-hint"
        />
        <p id="search-hint" className="text-xs mb-3" style={{ color: 'var(--color-mute)' }}>
          Describe what you&apos;re looking for. Results are ranked by semantic similarity.
        </p>
        <button
          type="submit"
          disabled={!query.trim() || searchStatus === 'searching'}
          className="rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          aria-busy={searchStatus === 'searching'}
        >
          {searchStatus === 'searching' ? 'Searching…' : 'Search documents'}
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
            Results
          </h2>
          <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {resultCount === 0
              ? 'No documents found.'
              : `${resultCount} document${resultCount === 1 ? '' : 's'} found.`}
          </p>

          {resultCount === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--color-mute)' }}>
              No documents matched your query.
            </p>
          ) : (
            <ul
              className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-2 mb-6"
              style={{ borderColor: 'var(--color-hairline)' }}
            >
              {results.map((doc) => {
                const isSelected = selected.has(doc.id)
                const pct = Math.round(doc.similarity * 100)
                return (
                  <li key={doc.id}>
                    <label className="flex items-center gap-3 px-3 py-2 rounded-sm cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(doc)}
                        aria-label={`Select ${doc.filename} (${pct}% match)`}
                        className="shrink-0"
                      />
                      <span
                        className="flex-1 text-sm truncate"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        {doc.filename}
                      </span>
                      <span
                        className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-sm"
                        style={{
                          backgroundColor:
                            pct >= 70 ? 'var(--color-accent-green)' : 'var(--color-hairline)',
                          color: pct >= 70 ? 'var(--color-ink)' : 'var(--color-body)',
                        }}
                        aria-label={`${pct}% similarity`}
                      >
                        {pct}%
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {/* Selected preview and run button */}
      {selectedCount > 0 && (
        <section
          aria-labelledby="selected-heading"
          className="border rounded-md p-4 mb-4"
          style={{ borderColor: 'var(--color-hairline)' }}
        >
          <h2
            id="selected-heading"
            className="text-xs font-medium uppercase tracking-[1.5px] mb-2"
            style={{ color: 'var(--color-mute)' }}
          >
            Selected ({selectedCount})
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
            disabled={selectedCount === 0}
            className="rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            Run analysis with {selectedCount} document{selectedCount === 1 ? '' : 's'}
          </button>
        </section>
      )}
    </div>
  )
}
