'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface DocumentRow {
  id: string
  filename: string
  document_type: string
  uploaded_at: string
  embedding: unknown
}

const TYPE_LABELS: Record<string, string> = { ett: 'ETT', hardware: 'Hardware', software: 'Software' }
const TYPE_COLORS: Record<string, string> = {
  ett: 'bg-[var(--color-accent-blue)] text-white',
  hardware: 'bg-[var(--color-accent-orange)] text-white',
  software: 'bg-emerald-600 text-white',
}

interface Props {
  documents: DocumentRow[]
  lang: string
}

export function DocumentList({ documents, lang }: Props) {
  const t = useTranslations('documents')
  const [filter, setFilter] = useState<'all' | 'ett' | 'hardware' | 'software'>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const filteredDocs = documents.filter(doc => {
    if (filter !== 'all' && doc.document_type !== filter) return false
    if (search.trim() && !doc.filename.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    all: documents.length,
    ett: documents.filter(d => d.document_type === 'ett').length,
    hardware: documents.filter(d => d.document_type === 'hardware').length,
    software: documents.filter(d => d.document_type === 'software').length,
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(filteredDocs.map(d => d.id)))
  }

  function deselectAll() {
    setSelected(new Set())
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    const confirmed = confirm(t('confirmBulkDelete', { count: selected.size }))
    if (!confirmed) return

    setDeleting(true)
    try {
      const ids = Array.from(selected)
      await Promise.all(ids.map(id => fetch(`/api/documents/${id}`, { method: 'DELETE' })))
      window.location.reload()
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'ett', 'hardware', 'software'] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm rounded-sm border font-medium transition-colors ${
              filter === f
                ? f === 'ett'
                  ? 'bg-[var(--color-accent-blue)] text-white border-transparent'
                  : f === 'hardware'
                    ? 'bg-[var(--color-accent-orange)] text-white border-transparent'
                    : f === 'software'
                      ? 'bg-emerald-600 text-white border-transparent'
                      : 'bg-[var(--color-primary)] text-white border-transparent'
                : 'border-[var(--color-hairline)] hover:opacity-70'
            }`}
            style={filter !== f ? { color: 'var(--color-ink)' } : undefined}
          >
            {f === 'all' ? t('allDocuments') : TYPE_LABELS[f]} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Search filter */}
      <input
        id="doc-search"
        name="doc-search"
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t('filterByName')}
        className="w-full border rounded-sm px-3 py-2 text-sm focus:outline-none mb-4"
        style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        autoComplete="off"
      />

      {/* Bulk actions bar */}
      {filteredDocs.length > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={selected.size === filteredDocs.length ? deselectAll : selectAll}
            className="text-xs px-3 py-1 rounded-sm border hover:opacity-70"
            style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
          >
            {selected.size === filteredDocs.length ? t('deselectAll') : t('selectAll')}
          </button>

          {selected.size > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={deleting}
              className="text-xs px-3 py-1 rounded-sm border transition-colors hover:bg-red-50 disabled:opacity-50"
              style={{ borderColor: 'var(--color-accent-red)', color: 'var(--color-accent-red)' }}
            >
              {deleting
                ? t('deleting')
                : t('deleteSelected', { count: selected.size })}
            </button>
          )}
        </div>
      )}

      {/* Document list */}
      {filteredDocs.length > 0 ? (
        <ul className="space-y-2">
          {filteredDocs.map((doc) => (
            <li key={doc.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.has(doc.id)}
                onChange={() => toggleSelect(doc.id)}
                className="shrink-0 ml-1"
                aria-label={`Select ${doc.filename}`}
              />
              <a
                href={`/${lang}/documents/${doc.id}`}
                className="flex-1 flex items-center justify-between border rounded-md px-4 py-3 hover:bg-gray-50 transition-colors"
                style={{ borderColor: 'var(--color-hairline)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`shrink-0 text-xs font-medium px-2 py-1 rounded-sm ${TYPE_COLORS[doc.document_type] ?? 'bg-gray-100'}`}
                  >
                    {TYPE_LABELS[doc.document_type] ?? doc.document_type}
                  </span>
                  <span
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {doc.filename}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {doc.embedding ? (
                    <span
                      className="text-xs"
                      style={{ color: 'var(--color-accent-green)' }}
                    >
                      ● {t('indexed')}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--color-mute)' }}>
                      ○ {t('notIndexed')}
                    </span>
                  )}
                  <time
                    className="text-xs"
                    style={{ color: 'var(--color-mute)' }}
                    dateTime={doc.uploaded_at}
                  >
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </time>
                </div>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div
          className="text-center py-12 border rounded-md"
          style={{ borderColor: 'var(--color-hairline)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-mute)' }}>
            {t('noDocuments')}
          </p>
        </div>
      )}
    </div>
  )
}
