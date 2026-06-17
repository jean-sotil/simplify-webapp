'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { searchChunksAction, type ChunkSearchResult } from '@/app/[lang]/documents/search/actions'

interface DocumentRow {
  id: string
  filename: string
  document_type: string
}

export function SemanticSearch() {
  const t = useTranslations('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChunkSearchResult[]>([])
  const [status, setStatus] = useState<'idle' | 'searching' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())
  const [showDocFilter, setShowDocFilter] = useState(false)
  const [precision, setPrecision] = useState(0.45)

  // Load documents for the filter
  useEffect(() => {
    // Load documents for the filter (exclude ETT - redundant for search)
    fetch('/api/documents')
      .then(r => r.json())
      .then(data => {
        const nonEtt = (data.documents || []).filter((d: DocumentRow) => d.document_type !== 'ett')
        setDocuments(nonEtt)
      })
      .catch(() => {})
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setStatus('searching')
    setError('')

    const options = selectedDocIds.size > 0
      ? { documentIds: Array.from(selectedDocIds), threshold: precision }
      : { threshold: precision }

    const result = await searchChunksAction(query, options)

    if (result.error) {
      setStatus('error')
      setError(result.error)
    } else {
      setResults(result.data ?? [])
      setStatus('done')
    }
  }

  function toggleDocSelection(docId: string) {
    setSelectedDocIds(prev => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId)
      else next.add(docId)
      return next
    })
  }

  return (
    <div>
      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('placeholder')}
          className="w-full border rounded-sm px-4 py-3 text-sm focus:outline-none mb-3"
          style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        />

        {/* Document filter toggle */}
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => setShowDocFilter(!showDocFilter)}
            className="text-xs underline hover:opacity-70"
            style={{ color: 'var(--color-mute)' }}
          >
            {showDocFilter ? t('hideFilter') : t('filterDocs')}
            {selectedDocIds.size > 0 && ` (${selectedDocIds.size} selected)`}
          </button>
          {selectedDocIds.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedDocIds(new Set())}
              className="text-xs hover:opacity-70"
              style={{ color: 'var(--color-accent-red)' }}
            >
              {t('clearFilter')}
            </button>
          )}
        </div>

        {/* Document filter list */}
        {showDocFilter && (
          <div
            className="mb-4 max-h-40 overflow-y-auto border rounded-sm p-2"
            style={{ borderColor: 'var(--color-hairline)' }}
          >
            {documents.map(doc => (
              <label key={doc.id} className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-gray-50 rounded-sm">
                <input
                  type="checkbox"
                  checked={selectedDocIds.has(doc.id)}
                  onChange={() => toggleDocSelection(doc.id)}
                  className="shrink-0"
                />
                <span
                  className={`px-1 py-0.5 rounded-sm text-[9px] font-medium ${
                    doc.document_type === 'ett'
                      ? 'bg-[var(--color-accent-blue)] text-white'
                      : doc.document_type === 'software'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[var(--color-accent-orange)] text-white'
                  }`}
                >
                  {doc.document_type === 'ett' ? 'ETT' : doc.document_type === 'hardware' ? 'HW' : 'SW'}
                </span>
                <span className="truncate" style={{ color: 'var(--color-ink)' }}>{doc.filename}</span>
              </label>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={!query.trim() || status === 'searching'}
          className="rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
        >
          {status === 'searching' ? t('searching') : t('button')}
        </button>

        {/* Precision slider */}
        <div className="flex items-center gap-3 mt-3">
          <label htmlFor="precision-slider" className="text-xs" style={{ color: 'var(--color-mute)' }}>
            {t('precision')}:
          </label>
          <input
            id="precision-slider"
            type="range"
            min="0.2"
            max="0.8"
            step="0.05"
            value={precision}
            onChange={e => setPrecision(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-[var(--color-primary)]"
          />
          <span className="text-xs font-medium w-10 text-right" style={{ color: 'var(--color-ink)' }}>
            {Math.round(precision * 100)}%
          </span>
        </div>
      </form>

      {/* Error */}
      {status === 'error' && (
        <p className="text-xs mb-4" style={{ color: 'var(--color-accent-red)' }}>{error}</p>
      )}

      {/* Results */}
      {status === 'done' && (
        <div>
          <p className="text-xs mb-4" style={{ color: 'var(--color-mute)' }}>
            {t('results', { count: results.length })}
          </p>

          {results.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--color-mute)' }}>
              {t('noResults')}
            </p>
          ) : (
            <ul className="space-y-4">
              {results.map(result => (
                <li
                  key={result.chunkId}
                  className="border rounded-md p-4"
                  style={{ borderColor: 'var(--color-hairline)' }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm ${
                        result.documentType === 'ett'
                          ? 'bg-[var(--color-accent-blue)] text-white'
                          : result.documentType === 'software'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[var(--color-accent-orange)] text-white'
                      }`}
                    >
                      {result.documentType === 'ett' ? 'ETT' : result.documentType === 'hardware' ? 'HW' : 'SW'}
                    </span>
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>
                      {result.filename}
                    </span>
                    {result.pageNumber && (
                      <span className="text-xs" style={{ color: 'var(--color-mute)' }}>
                        {t('page')} {result.pageNumber}
                      </span>
                    )}
                    <span className="ml-auto text-xs" style={{ color: 'var(--color-mute)' }}>
                      {(result.similarity * 100).toFixed(0)}% {t('match')}
                    </span>
                  </div>

                  {/* Content preview */}
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--color-body)' }}
                  >
                    {result.chunkText.substring(0, 400)}
                    {result.chunkText.length > 400 && '...'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
