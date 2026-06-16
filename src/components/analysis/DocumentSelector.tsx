'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { SelectedDocument } from '@/lib/validation/schemas'

export interface EttDocument {
  id: string
  filename: string
  url: string
}

interface DocumentRow {
  id: string
  filename: string
  document_type: string
  uploaded_at: string
}

interface DocumentSelectorProps {
  ettDocument?: EttDocument
  onRunAnalysis?: (selected: SelectedDocument[]) => void
  disabled?: boolean
}

export function DocumentSelector({ ettDocument, onRunAnalysis, disabled = false }: DocumentSelectorProps) {
  const t = useTranslations('analysis')
  const tc = useTranslations('common')
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [selected, setSelected] = useState<Map<string, DocumentRow>>(new Map())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'hardware' | 'software'>('all')
  const [searchText, setSearchText] = useState('')

  // Load all non-ETT documents on mount
  useEffect(() => {
    async function loadDocuments() {
      setLoading(true)
      try {
        const res = await fetch('/api/documents')
        const data = await res.json()
        const docs = (data.documents || []).filter(
          (d: DocumentRow) => d.document_type === 'hardware' || d.document_type === 'software'
        )
        setDocuments(docs)
      } catch {
        setDocuments([])
      }
      setLoading(false)
    }
    loadDocuments()
  }, [])

  function toggleSelection(doc: DocumentRow) {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(doc.id)) {
        next.delete(doc.id)
      } else {
        next.set(doc.id, doc)
      }
      return next
    })
  }

  function selectAll() {
    const filtered = getFilteredDocs()
    setSelected(prev => {
      const next = new Map(prev)
      filtered.forEach(doc => next.set(doc.id, doc))
      return next
    })
  }

  function deselectAll() {
    const filtered = getFilteredDocs()
    setSelected(prev => {
      const next = new Map(prev)
      filtered.forEach(doc => next.delete(doc.id))
      return next
    })
  }

  function getFilteredDocs() {
    let docs = documents
    if (filter !== 'all') {
      docs = docs.filter(d => d.document_type === filter)
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      docs = docs.filter(d => d.filename.toLowerCase().includes(q))
    }
    return docs
  }

  function handleRunAnalysis() {
    const selectedDocs: SelectedDocument[] = Array.from(selected.values()).map(doc => ({
      id: doc.id,
      filename: doc.filename,
      url: '',
      documentType: doc.document_type as 'hardware' | 'software',
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

  const filteredDocs = getFilteredDocs()
  const selectedCount = selected.size

  return (
    <div>
      {/* ETT context banner */}
      {ettDocument && (
        <div
          className="mb-6 rounded-md px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--color-accent-blue)', color: '#fff' }}
        >
          <span className="font-medium">ETT: </span>
          {ettDocument.filename}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'hardware', 'software'] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm rounded-sm border font-medium transition-colors ${
              filter === f
                ? f === 'hardware'
                  ? 'bg-[var(--color-accent-orange)] text-white border-transparent'
                  : f === 'software'
                    ? 'bg-emerald-600 text-white border-transparent'
                    : 'bg-[var(--color-primary)] text-white border-transparent'
                : 'border-[var(--color-hairline)] hover:opacity-70'
            }`}
            style={filter !== f ? { color: 'var(--color-ink)' } : undefined}
          >
            {f === 'all' ? t('all') : f === 'hardware' ? t('hardware') : t('software')}
            {f === 'all' ? ` (${documents.length})` : ` (${documents.filter(d => d.document_type === f).length})`}
          </button>
        ))}
      </div>

      {/* Search filter */}
      <input
        id="filter-docs"
        name="filter-docs"
        type="text"
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        placeholder={t('filterByName')}
        className="w-full border rounded-sm px-3 py-2 text-sm focus:outline-none mb-4"
        style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        autoComplete="off"
      />

      {/* Document list */}
      {loading ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--color-mute)' }}>
          {tc('loadingDocuments')}
        </p>
      ) : filteredDocs.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--color-mute)' }}>
          {tc('noDocumentsUploaded')}
        </p>
      ) : (
        <>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs px-3 py-1 rounded-sm border hover:opacity-70"
              style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
            >
              {t('selectAll')}
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="text-xs px-3 py-1 rounded-sm border hover:opacity-70"
              style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-mute)' }}
            >
              {t('deselectAll')}
            </button>
          </div>
          <ul
            className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-2 mb-6"
            style={{ borderColor: 'var(--color-hairline)' }}
          >
            {filteredDocs.map(doc => {
              const isSelected = selected.has(doc.id)
              return (
                <li key={doc.id}>
                  <label className="flex items-center gap-3 px-3 py-2 rounded-sm cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(doc)}
                      className="shrink-0"
                    />
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm ${
                        doc.document_type === 'hardware'
                          ? 'bg-[var(--color-accent-orange)] text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {doc.document_type === 'hardware' ? 'HW' : 'SW'}
                    </span>
                    <span
                      className="flex-1 text-sm truncate"
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

      {/* Run analysis button */}
      {selectedCount > 0 && (
        <button
          type="button"
          onClick={handleRunAnalysis}
          disabled={disabled}
          className="w-full rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
        >
          {t('runAnalysis', { count: selectedCount })}
        </button>
      )}
    </div>
  )
}
