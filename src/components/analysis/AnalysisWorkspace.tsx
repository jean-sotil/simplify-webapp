'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { triggerAnalysis } from '@/app/[lang]/projects/[id]/analysis/actions'
import { AnalysisResults, type AnalysisResultData } from './AnalysisResults'
import type { SelectedDocument } from '@/lib/validation/schemas'

interface AnalysisDoc {
  id: string
  document_id: string
  added_at: string
  documents: { id: string; filename: string; document_type: string; original_file_url: string } | null
}

interface AvailableDoc {
  id: string
  filename: string
  document_type: string
}

interface Props {
  projectId: string
  projectName: string
  ettDocuments: Array<{ id: string; filename: string; url: string }>
  initialAnalysis: AnalysisResultData | null
  lang: string
}

const TYPE_BADGE: Record<string, { bg: string; label: string }> = {
  ett: { bg: 'bg-[var(--color-accent-blue)]', label: 'ETT' },
  hardware: { bg: 'bg-[var(--color-accent-orange)]', label: 'HW' },
  software: { bg: 'bg-emerald-600', label: 'SW' },
}

export function AnalysisWorkspace({ projectId, projectName: _projectName, ettDocuments, initialAnalysis, lang: _lang }: Props) {
  const t = useTranslations('analysis')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [analysisDocs, setAnalysisDocs] = useState<AnalysisDoc[]>([])
  const [allDocs, setAllDocs] = useState<AvailableDoc[]>([])
  const [analysisRunning, setAnalysisRunning] = useState(false)
  const [triggerError, setTriggerError] = useState<string | null>(null)

  // Load analysis documents for this project
  useEffect(() => { loadAnalysisDocs() }, [projectId])

  async function loadAnalysisDocs() {
    const res = await fetch(`/api/project-analysis-docs?projectId=${projectId}`)
    if (res.ok) {
      const data = await res.json()
      const docs = data.documents ?? []
      // Auto-migrate ETTs from project_documents if analysis docs is empty
      if (docs.length === 0 && ettDocuments.length > 0) {
        await fetch('/api/project-analysis-docs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, documentIds: ettDocuments.map(d => d.id) }),
        })
        const res2 = await fetch(`/api/project-analysis-docs?projectId=${projectId}`)
        if (res2.ok) {
          const data2 = await res2.json()
          setAnalysisDocs(data2.documents ?? [])
        }
      } else {
        setAnalysisDocs(docs)
      }
    }
  }

  // Load all available documents
  useEffect(() => {
    async function load() {
      const res = await fetch('/api/documents')
      if (res.ok) {
        const data = await res.json()
        setAllDocs(data.documents || [])
      }
    }
    load()
  }, [])

  // Split analysis docs into ETT and provider (exclude sustento)
  const addedDocIds = new Set(analysisDocs.map(d => d.documents?.id).filter(Boolean))
  const ettDocs = analysisDocs.filter(d => d.documents?.document_type === 'ett')
  const providerDocs = analysisDocs.filter(d => d.documents && (d.documents.document_type === 'hardware' || d.documents.document_type === 'software'))

  // Available docs not yet added
  const availableEtts = allDocs.filter(d => d.document_type === 'ett' && !addedDocIds.has(d.id))
  const availableProviders = allDocs.filter(d => (d.document_type === 'hardware' || d.document_type === 'software') && !addedDocIds.has(d.id))

  const canRunAnalysis = ettDocs.length > 0 && providerDocs.length > 0

  async function handleAddDocs(documentIds: string[]) {
    await fetch('/api/project-analysis-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, documentIds }),
    })
    await loadAnalysisDocs()
  }

  async function handleRemoveDoc(documentId: string) {
    await fetch(`/api/project-analysis-docs?projectId=${projectId}&documentId=${documentId}`, { method: 'DELETE' })
    await loadAnalysisDocs()
  }

  function handleRunAnalysis() {
    setTriggerError(null)
    setAnalysisRunning(true)
    startTransition(async () => {
      const docsInAnalysis = analysisDocs
        .filter(d => d.documents && d.documents.document_type !== 'sustento')
        .map(d => d.documents!)
      const selectedDocs: SelectedDocument[] = docsInAnalysis.map(d => ({
        id: d.id,
        filename: d.filename,
        url: d.original_file_url,
        documentType: d.document_type as 'ett' | 'hardware' | 'software',
        relatedRequirements: [],
      }))
      const result = await triggerAnalysis(projectId, selectedDocs)
      if ('error' in result && result.error) {
        setTriggerError(typeof result.error === 'string' ? result.error : 'Error')
        setAnalysisRunning(false)
      } else {
        // Analysis triggered successfully — refresh to show results
        // Small delay to let the analysis start processing
        setTimeout(() => {
          setAnalysisRunning(false)
          router.refresh()
        }, 3000)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Section 1: ETT Documents */}
      <DocumentSection
        title={t('ettSection')}
        description={t('ettSectionDesc')}
        docs={ettDocs}
        availableDocs={availableEtts}
        onAdd={handleAddDocs}
        onRemove={handleRemoveDoc}
        emptyMessage={t('noEtts')}
        badgeType="ett"
        projectId={projectId}
        t={t}
      />

      {/* Section 2: Provider Documents */}
      <DocumentSection
        title={t('providerSection')}
        description={t('providerSectionDesc')}
        docs={providerDocs}
        availableDocs={availableProviders}
        onAdd={handleAddDocs}
        onRemove={handleRemoveDoc}
        emptyMessage={t('noProviderDocs')}
        badgeType="provider"
        projectId={projectId}
        t={t}
      />

      {/* Run Analysis */}
      <section className="border rounded-md p-5" style={{ borderColor: 'var(--color-hairline)' }}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!canRunAnalysis || isPending || analysisRunning}
            onClick={handleRunAnalysis}
            className="rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            {isPending || analysisRunning ? t('triggering') : t('runAnalysisBtn')}
          </button>
          {!canRunAnalysis && (
            <span className="text-xs" style={{ color: 'var(--color-mute)' }}>
              {t('analysisRequires')}
            </span>
          )}
          {triggerError && (
            <span className="text-xs" style={{ color: 'var(--color-accent-red)' }}>{triggerError}</span>
          )}
        </div>
      </section>

      {/* Section 3: Analysis Results */}
      <AnalysisResults result={initialAnalysis} projectId={projectId} />

    </div>
  )
}

// Reusable document section component
function DocumentSection({
  title,
  description,
  docs,
  availableDocs,
  onAdd,
  onRemove,
  emptyMessage,
  badgeType,
  projectId: _projectId,
  t,
}: {
  title: string
  description: string
  docs: AnalysisDoc[]
  availableDocs: AvailableDoc[]
  onAdd: (ids: string[]) => Promise<void>
  onRemove: (id: string) => Promise<void>
  emptyMessage: string
  badgeType: 'ett' | 'provider'
  projectId: string
  t: ReturnType<typeof useTranslations<'analysis'>>
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'hardware' | 'software'>('all')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const filteredAvailable = availableDocs.filter(d => {
    if (search.trim() && !d.filename.toLowerCase().includes(search.toLowerCase())) return false
    if (badgeType === 'provider' && typeFilter !== 'all' && d.document_type !== typeFilter) return false
    return true
  })

  async function handleConfirm() {
    if (selected.size === 0) return
    setAdding(true)
    await onAdd(Array.from(selected))
    setSelected(new Set())
    setShowAdd(false)
    setAdding(false)
  }

  return (
    <section className="border rounded-md p-5" style={{ borderColor: 'var(--color-hairline)' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-[1.5px]" style={{ color: 'var(--color-mute)' }}>
            {title} ({docs.length})
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-mute)' }}>{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs px-3 py-1.5 rounded-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
        >
          {t('addDocuments')}
        </button>
      </div>

      {/* Add documents panel - appears right after the button */}
      {showAdd && (
        <div className="border rounded-sm p-4 mb-3" style={{ borderColor: 'var(--color-primary)', backgroundColor: '#fafafa' }}>
          {/* Type filter tabs (only for provider section) */}
          {badgeType === 'provider' && (
            <div className="flex gap-1.5 mb-3">
              {(['all', 'hardware', 'software'] as const).map(f => {
                const count = f === 'all' ? availableDocs.length : availableDocs.filter(d => d.document_type === f).length
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setTypeFilter(f)}
                    className={`px-3 py-1 text-xs rounded-sm border font-medium transition-colors ${
                      typeFilter === f
                        ? f === 'hardware'
                          ? 'bg-[var(--color-accent-orange)] text-white border-transparent'
                          : f === 'software'
                            ? 'bg-emerald-600 text-white border-transparent'
                            : 'bg-[var(--color-primary)] text-white border-transparent'
                        : 'border-[var(--color-hairline)]'
                    }`}
                    style={typeFilter !== f ? { color: 'var(--color-ink)' } : undefined}
                  >
                    {f === 'all' ? t('all') : f === 'hardware' ? 'HW' : 'SW'} ({count})
                  </button>
                )
              })}
            </div>
          )}

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('filterByName')}
            className="w-full border rounded-sm px-3 py-2 text-xs mb-3 focus:outline-none"
            style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
          />

          {/* List */}
          <ul className="space-y-1 max-h-48 overflow-y-auto mb-3">
            {filteredAvailable.length === 0 ? (
              <li className="text-xs py-3 text-center" style={{ color: 'var(--color-mute)' }}>
                {availableDocs.length === 0 ? t('allDocsAdded') : t('noDocsMatch')}
              </li>
            ) : (
              filteredAvailable.map(doc => {
                const badge = TYPE_BADGE[doc.document_type] || { bg: 'bg-gray-400', label: doc.document_type.toUpperCase() }
                return (
                  <li key={doc.id} className="flex items-center gap-2 py-1.5 px-1 rounded-sm hover:bg-white">
                    <input
                      type="checkbox"
                      checked={selected.has(doc.id)}
                      onChange={() => {
                        const next = new Set(selected)
                        if (next.has(doc.id)) next.delete(doc.id)
                        else next.add(doc.id)
                        setSelected(next)
                      }}
                      className="shrink-0"
                    />
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm text-white shrink-0 ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs truncate" style={{ color: 'var(--color-ink)' }}>{doc.filename}</span>
                  </li>
                )
              })
            )}
          </ul>

          {/* Upload new file */}
          <div className="mb-3 pt-2 border-t" style={{ borderColor: 'var(--color-hairline)' }}>
            <label
              className="flex items-center justify-center gap-2 border-2 border-dashed rounded-sm px-4 py-3 cursor-pointer hover:bg-white transition-colors"
              style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-mute)' }}
            >
              <span className="text-xs">{uploading ? t('uploadingFile') : t('uploadNew')}</span>
              <input
                type="file"
                accept=".pdf"
                multiple
                disabled={uploading}
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files
                  if (!files || files.length === 0) return
                  setUploading(true)
                  setUploadError(null)
                  try {
                    const docType = badgeType === 'ett' ? 'ett' : 'hardware'
                    const newDocIds: string[] = []
                    for (const file of Array.from(files)) {
                      const formData = new FormData()
                      formData.append('file', file)
                      formData.append('documentType', docType)
                      // Use the uploadDocument server action via form submission
                      const { uploadDocument } = await import('@/app/[lang]/documents/actions')
                      const result = await uploadDocument(formData)
                      if (result && 'data' in result && result.data?.id) {
                        newDocIds.push(result.data.id)
                      }
                    }
                    if (newDocIds.length > 0) {
                      await onAdd(newDocIds)
                    }
                    // Reload available docs
                    window.location.reload()
                  } catch (err) {
                    setUploadError(err instanceof Error ? err.message : 'Upload failed')
                  } finally {
                    setUploading(false)
                    e.target.value = ''
                  }
                }}
              />
            </label>
            {uploadError && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-accent-red)' }}>{uploadError}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-hairline)' }}>
            <button
              type="button"
              disabled={selected.size === 0 || adding}
              onClick={handleConfirm}
              className="text-xs px-4 py-2 rounded-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
            >
              {adding ? '...' : `${t('confirmAdd')} (${selected.size})`}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setSelected(new Set()); setSearch('') }}
              className="text-xs px-4 py-2 rounded-sm border hover:bg-gray-50"
              style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
            >
              {t('cancelAdd')}
            </button>
          </div>
        </div>
      )}

      {/* Document list */}
      {docs.length > 0 ? (
        <ul className="space-y-1.5 mb-3">
          {docs.map(row => {
            const doc = row.documents
            if (!doc) return null
            const badge = TYPE_BADGE[doc.document_type] || { bg: 'bg-gray-400', label: doc.document_type.toUpperCase() }
            return (
              <li key={row.id} className="flex items-center justify-between border rounded-sm px-3 py-2" style={{ borderColor: 'var(--color-hairline)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-sm text-white shrink-0 ${badge.bg}`}>
                    {badge.label}
                  </span>
                  <span className="text-sm truncate" style={{ color: 'var(--color-ink)' }}>{doc.filename}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(doc.id)}
                  className="text-xs hover:underline shrink-0 ml-2"
                  style={{ color: 'var(--color-accent-red)' }}
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm py-3 text-center" style={{ color: 'var(--color-mute)' }}>
          {emptyMessage}
        </p>
      )}

      {/* (panel moved above the list) */}
    </section>
  )
}
