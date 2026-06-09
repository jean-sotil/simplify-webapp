'use client'

import { useState, useEffect } from 'react'
import type { SelectedDocument } from '@/lib/validation/schemas'

interface HardwareDocument {
  id: string
  filename: string
  document_type: string
}

interface DocumentSelectorProps {
  onRunAnalysis?: (selected: SelectedDocument[]) => void
  documentTypeFilter?: 'ett' | 'hardware'
  projectId?: string
}

export function DocumentSelector({ onRunAnalysis, documentTypeFilter = 'hardware', projectId = '' }: DocumentSelectorProps) {
  const [documents, setDocuments] = useState<HardwareDocument[]>([])
  const [selected, setSelected] = useState<Map<string, HardwareDocument>>(new Map())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  // Load documents on mount
  useEffect(() => {
    async function loadDocuments() {
      setLoading(true)
      try {
        const res = await fetch(`/api/documents?type=${documentTypeFilter}&projectId=${projectId}`)
        if (res.ok) {
          const data = await res.json()
          setDocuments(data.documents || [])
        }
      } catch {
        // fallback: try the search action with empty query
      } finally {
        setLoading(false)
      }
    }
    loadDocuments()
  }, [documentTypeFilter, projectId])

  function toggleSelection(doc: HardwareDocument) {
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

  function selectAll() {
    const filtered = getFilteredDocs()
    const next = new Map<string, HardwareDocument>()
    filtered.forEach(doc => next.set(doc.id, doc))
    setSelected(next)
  }

  function deselectAll() {
    setSelected(new Map())
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

  function getFilteredDocs() {
    if (!filter.trim()) return documents
    const q = filter.toLowerCase()
    return documents.filter(d => d.filename.toLowerCase().includes(q))
  }

  const filteredDocs = getFilteredDocs()
  const selectedCount = selected.size

  return (
    <div>
      {/* Filter input (optional string search) */}
      <div className="mb-4">
        <label
          htmlFor="filter-docs"
          className="block text-xs font-medium uppercase tracking-[1.5px] mb-2"
          style={{ color: 'var(--color-mute)' }}
        >
          Filter documents
        </label>
        <input
          id="filter-docs"
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Type to filter by filename..."
          className="w-full border rounded-sm px-4 py-2 text-sm focus:outline-none"
          style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        />
      </div>

      {/* Document list */}
      {loading ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--color-mute)' }}>
          Loading documents...
        </p>
      ) : filteredDocs.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--color-mute)' }}>
          No hardware documents found. Upload datasheets in the Documents section first.
        </p>
      ) : (
        <section aria-labelledby="hw-docs-heading">
          <div className="flex items-center justify-between mb-2">
            <h2
              id="hw-docs-heading"
              className="text-xs font-medium uppercase tracking-[1.5px]"
              style={{ color: 'var(--color-mute)' }}
            >
              Hardware documents ({filteredDocs.length})
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs px-2 py-1 rounded-sm border hover:bg-gray-50"
                style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-body)' }}
              >
                Select all
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="text-xs px-2 py-1 rounded-sm border hover:bg-gray-50"
                style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-body)' }}
              >
                Clear
              </button>
            </div>
          </div>

          <ul
            className="space-y-1 max-h-80 overflow-y-auto border rounded-md p-2 mb-4"
            style={{ borderColor: 'var(--color-hairline)' }}
          >
            {filteredDocs.map((doc) => {
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
        </section>
      )}

      {/* Run analysis button */}
      {selectedCount > 0 && (
        <div
          className="border rounded-md p-4"
          style={{ borderColor: 'var(--color-hairline)' }}
        >
          <p className="text-xs mb-3" style={{ color: 'var(--color-mute)' }}>
            {selectedCount} document{selectedCount === 1 ? '' : 's'} selected for analysis
          </p>
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
