'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { UnfoundRequirementsTable } from './UnfoundRequirementsTable'
import { LlmConfigPanel } from './LlmConfigPanel'

interface UnfoundReq {
  requirementId: string
  text: string
  partida: string
  partidaDesc: string
}

interface SustentoDoc {
  id: string
  filename: string
  document_type: string
}

interface Props {
  projectId: string
  projectName: string
  analysisId: string
  analysisMetadata: Record<string, unknown> | null
  analysisCompletedAt: string | null
  initialCarpetaUrl: string | null
  lang: string
  isAdmin?: boolean
}

export function SustentoWorkspace({ projectId, projectName: _projectName, analysisId, analysisMetadata, analysisCompletedAt, initialCarpetaUrl, lang: _lang, isAdmin = false }: Props) {
  const t = useTranslations('sustento')

  const [carpetaLoading, setCarpetaLoading] = useState(false)
  const [carpetaUrl, setCarpetaUrl] = useState<string | null>(initialCarpetaUrl)
  const [carpetaError, setCarpetaError] = useState<string | null>(null)
  const [sustentoCount, setSustentoCount] = useState(0)

  // The metrics on this page show ACCUMULATED results:
  // analysis found + sustento covered = total effective found
  // sustentoCount comes from UnfoundRequirementsTable (manual links)
  // This keeps sustento metrics separate from analysis page metrics

  // Sustento documents state
  const [sustentoDocs, setSustentoDocs] = useState<SustentoDoc[]>([])
  const [availableSustento, setAvailableSustento] = useState<SustentoDoc[]>([])
  const [showAddSustento, setShowAddSustento] = useState(false)
  const [selectedSustento, setSelectedSustento] = useState<Set<string>>(new Set())
  const [addingSustento, setAddingSustento] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [searchSustento, setSearchSustento] = useState('')

  // Sustento analysis state
  const [sustentoAnalysisRunning, setSustentoAnalysisRunning] = useState(false)
  const [sustentoAnalysisError, setSustentoAnalysisError] = useState<string | null>(null)
  const [sustentoAnalysisResult, setSustentoAnalysisResult] = useState<{ found: number; total: number } | null>(null)
  const [sustentoLogs, setSustentoLogs] = useState<string[]>([])

  // Ref for UnfoundRequirementsTable reload
  const [reloadTrigger, setReloadTrigger] = useState(0)

  // Extract unfound requirements from analysis metadata
  const metadata = analysisMetadata as {
    totalRequirements?: number
    unfoundRequirements?: UnfoundReq[]
  } | null

  const unfoundRequirements = metadata?.unfoundRequirements ?? []
  const totalRequirements = metadata?.totalRequirements ?? 0
  const analysisFoundCount = totalRequirements - unfoundRequirements.length
  const effectiveFoundCount = analysisFoundCount + sustentoCount
  const effectiveNotFoundCount = Math.max(0, unfoundRequirements.length - sustentoCount)
  const compliancePercent = totalRequirements > 0
    ? ((effectiveFoundCount / totalRequirements) * 100).toFixed(1)
    : '0.0'

  const completedAt = analysisCompletedAt ? new Date(analysisCompletedAt).toLocaleString() : null

  // Load sustento documents linked to this project
  useEffect(() => { loadSustentoDocs() }, [projectId])

  async function loadSustentoDocs() {
    const res = await fetch(`/api/project-analysis-docs?projectId=${projectId}`)
    if (res.ok) {
      const data = await res.json()
      const docs = (data.documents ?? [])
        .filter((d: { documents: SustentoDoc | null }) => d.documents?.document_type === 'sustento')
        .map((d: { documents: SustentoDoc }) => d.documents)
      setSustentoDocs(docs)
    }
  }

  // Load available sustento docs from library
  useEffect(() => {
    async function load() {
      const res = await fetch('/api/documents')
      if (res.ok) {
        const data = await res.json()
        setAvailableSustento((data.documents || []).filter((d: SustentoDoc) => d.document_type === 'sustento'))
      }
    }
    load()
  }, [])

  const linkedSustentoIds = new Set(sustentoDocs.map(d => d.id))
  const sustentoNotLinked = availableSustento.filter(d => !linkedSustentoIds.has(d.id))
  const filteredSustentoNotLinked = sustentoNotLinked.filter(d =>
    !searchSustento.trim() || d.filename.toLowerCase().includes(searchSustento.toLowerCase())
  )

  async function handleAddSustentoDocs() {
    if (selectedSustento.size === 0) return
    setAddingSustento(true)
    await fetch('/api/project-analysis-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, documentIds: Array.from(selectedSustento) }),
    })
    await loadSustentoDocs()
    setSelectedSustento(new Set())
    setShowAddSustento(false)
    setAddingSustento(false)
  }

  async function handleRemoveSustentoDoc(documentId: string) {
    await fetch(`/api/project-analysis-docs?projectId=${projectId}&documentId=${documentId}`, { method: 'DELETE' })
    await loadSustentoDocs()
  }

  async function handleRunSustentoAnalysis() {
    if (sustentoDocs.length === 0 || unfoundRequirements.length === 0) return
    setSustentoAnalysisRunning(true)
    setSustentoAnalysisError(null)
    setSustentoAnalysisResult(null)
    setSustentoLogs([`Sending ${unfoundRequirements.length} requirements to analyze against ${sustentoDocs.length} support letter(s)...`])
    // Clear carpeta URL since sustento results are changing
    setCarpetaUrl(null)
    try {
      setSustentoLogs(prev => [...prev, 'Calling LLM for compliance verification...'])
      const res = await fetch('/api/analyze-sustento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          analysisId,
          requirements: unfoundRequirements.map(r => ({ requirementId: r.requirementId, text: r.text })),
          documentIds: sustentoDocs.map(d => d.id),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Analysis failed')
      }
      const data = await res.json()
      setSustentoAnalysisResult({ found: data.found, total: data.total })
      setSustentoLogs(prev => [...prev, `Analysis complete: ${data.found}/${data.total} requirements found in support letters.`])

      // Reload sustento links without page refresh
      setReloadTrigger(prev => prev + 1)
    } catch (err) {
      setSustentoAnalysisError(err instanceof Error ? err.message : 'Error')
      setSustentoLogs(prev => [...prev, `Error: ${err instanceof Error ? err.message : 'Unknown error'}`])
    } finally {
      setSustentoAnalysisRunning(false)
    }
  }

  async function handleGenerateCarpeta() {
    setCarpetaLoading(true)
    setCarpetaError(null)
    try {
      const res = await fetch('/api/generate-carpeta-digital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, projectId, source: 'sustento' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate')
      }
      const data = await res.json()
      setCarpetaUrl(data.zipUrl)
    } catch (err) {
      setCarpetaError(err instanceof Error ? err.message : 'Error')
    } finally {
      setCarpetaLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Sustento Documents Section */}
      <section className="border rounded-md p-5" style={{ borderColor: 'var(--color-hairline)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-medium uppercase tracking-[1.5px]" style={{ color: 'var(--color-mute)' }}>
              {t('sustentoDocsSection')} ({sustentoDocs.length})
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-mute)' }}>{t('sustentoDocsDesc')}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddSustento(!showAddSustento)}
            className="text-xs px-3 py-1.5 rounded-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#8b5cf6', color: 'white' }}
          >
            {t('addSustento')}
          </button>
        </div>

        {/* Add sustento panel */}
        {showAddSustento && (
          <div className="border rounded-sm p-4 mb-3" style={{ borderColor: '#8b5cf6', backgroundColor: '#fafafa' }}>
            {/* Search */}
            <input
              type="text"
              value={searchSustento}
              onChange={e => setSearchSustento(e.target.value)}
              placeholder={t('searchSustento')}
              className="w-full border rounded-sm px-3 py-2 text-xs mb-3 focus:outline-none"
              style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
            />

            {/* Available sustento list */}
            <ul className="space-y-1 max-h-40 overflow-y-auto mb-3">
              {filteredSustentoNotLinked.length === 0 ? (
                <li className="text-xs py-3 text-center" style={{ color: 'var(--color-mute)' }}>
                  {t('noSustentoAvailable')}
                </li>
              ) : (
                filteredSustentoNotLinked.map(doc => (
                  <li key={doc.id} className="flex items-center gap-2 py-1.5 px-1 rounded-sm hover:bg-white">
                    <input
                      type="checkbox"
                      checked={selectedSustento.has(doc.id)}
                      onChange={() => {
                        const next = new Set(selectedSustento)
                        if (next.has(doc.id)) next.delete(doc.id)
                        else next.add(doc.id)
                        setSelectedSustento(next)
                      }}
                      className="shrink-0"
                    />
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm text-white shrink-0 bg-violet-600">
                      SUS
                    </span>
                    <span className="text-xs truncate" style={{ color: 'var(--color-ink)' }}>{doc.filename}</span>
                  </li>
                ))
              )}
            </ul>

            {/* Upload new sustento file */}
            <div className="mb-3 pt-2 border-t" style={{ borderColor: 'var(--color-hairline)' }}>
              <label
                className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-sm px-4 py-4 cursor-pointer transition-colors ${dragOver ? 'bg-violet-50' : 'hover:bg-white'}`}
                style={{ borderColor: dragOver ? '#8b5cf6' : uploading ? '#8b5cf6' : 'var(--color-hairline)', color: 'var(--color-mute)' }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false) }}
                onDrop={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragOver(false)
                  const files = e.dataTransfer.files
                  if (!files || files.length === 0) return
                  const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
                  if (pdfFiles.length === 0) return
                  setUploading(true)
                  setUploadError(null)
                  try {
                    const newDocIds: string[] = []
                    for (const file of pdfFiles) {
                      const formData = new FormData()
                      formData.append('file', file)
                      formData.append('documentType', 'sustento')
                      const { uploadDocument } = await import('@/app/[lang]/documents/actions')
                      const result = await uploadDocument(formData)
                      if (result && 'error' in result && result.error) {
                        setUploadError(typeof result.error === 'string' ? result.error : 'Upload failed')
                        break
                      }
                      if (result && 'data' in result && result.data?.id) {
                        newDocIds.push(result.data.id)
                      }
                    }
                    if (newDocIds.length > 0) {
                      await fetch('/api/project-analysis-docs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ projectId, documentIds: newDocIds }),
                      })
                      await loadSustentoDocs()
                      const res = await fetch('/api/documents')
                      if (res.ok) {
                        const data = await res.json()
                        setAvailableSustento((data.documents || []).filter((d: SustentoDoc) => d.document_type === 'sustento'))
                      }
                    }
                  } catch (err) {
                    setUploadError(err instanceof Error ? err.message : 'Upload failed')
                  } finally {
                    setUploading(false)
                  }
                }}
              >
                <span className="text-xs">{uploading ? t('uploadingFile') : t('uploadSustento')}</span>
                <span className="text-[10px]" style={{ color: 'var(--color-mute)' }}>Click or drag & drop PDF files</span>
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
                      const newDocIds: string[] = []
                      for (const file of Array.from(files)) {
                        const formData = new FormData()
                        formData.append('file', file)
                        formData.append('documentType', 'sustento')
                        const { uploadDocument } = await import('@/app/[lang]/documents/actions')
                        const result = await uploadDocument(formData)
                        if (result && 'error' in result && result.error) {
                          setUploadError(typeof result.error === 'string' ? result.error : 'Upload failed')
                          break
                        }
                        if (result && 'data' in result && result.data?.id) {
                          newDocIds.push(result.data.id)
                        }
                      }
                      if (newDocIds.length > 0) {
                        await fetch('/api/project-analysis-docs', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ projectId, documentIds: newDocIds }),
                        })
                        await loadSustentoDocs()
                        const res = await fetch('/api/documents')
                        if (res.ok) {
                          const data = await res.json()
                          setAvailableSustento((data.documents || []).filter((d: SustentoDoc) => d.document_type === 'sustento'))
                        }
                      }
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
                disabled={selectedSustento.size === 0 || addingSustento}
                onClick={handleAddSustentoDocs}
                className="text-xs px-4 py-2 rounded-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#8b5cf6', color: 'white' }}
              >
                {addingSustento ? '...' : `${t('confirmAddSustento')} (${selectedSustento.size})`}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddSustento(false); setSelectedSustento(new Set()); setSearchSustento('') }}
                className="text-xs px-4 py-2 rounded-sm border hover:bg-gray-50"
                style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
              >
                {t('cancelSustento')}
              </button>
            </div>
          </div>
        )}

        {/* Current sustento documents list */}
        {sustentoDocs.length > 0 ? (
          <ul className="space-y-1.5">
            {sustentoDocs.map(doc => (
              <li key={doc.id} className="flex items-center justify-between border rounded-sm px-3 py-2" style={{ borderColor: 'var(--color-hairline)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-sm text-white shrink-0 bg-violet-600">
                    SUS
                  </span>
                  <span className="text-sm truncate" style={{ color: 'var(--color-ink)' }}>{doc.filename}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSustentoDoc(doc.id)}
                  className="text-xs hover:underline shrink-0 ml-2"
                  style={{ color: 'var(--color-accent-red)' }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm py-3 text-center" style={{ color: 'var(--color-mute)' }}>
            {t('noSustentoDocs')}
          </p>
        )}
      </section>

      {/* LLM Config (admin only) */}
      <LlmConfigPanel projectId={projectId} isAdmin={isAdmin} />

      {/* Run Sustento Analysis */}
      {sustentoDocs.length > 0 && unfoundRequirements.length > 0 && (
        <section className="border rounded-md p-5" style={{ borderColor: 'var(--color-hairline)' }}>
          <div className="flex items-center gap-3 flex-wrap">
            {sustentoAnalysisRunning ? (
              <div className="flex items-center gap-3">
                <span
                  className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'var(--color-hairline)', borderTopColor: 'var(--color-primary)' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{t('analyzingSustento')}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRunSustentoAnalysis}
                className="rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
              >
                {t('runAnalysisBtn')}
              </button>
            )}
            {sustentoAnalysisResult && !sustentoAnalysisRunning && (
              <span className="text-xs" style={{ color: 'var(--color-accent-green)' }}>
                ● {t('sustentoAnalysisResult', { found: sustentoAnalysisResult.found, total: sustentoAnalysisResult.total })}
              </span>
            )}
            {sustentoAnalysisError && (
              <span className="text-xs" style={{ color: 'var(--color-accent-red)' }}>{sustentoAnalysisError}</span>
            )}
          </div>
          {sustentoAnalysisRunning && sustentoLogs.length > 0 && (
            <div className="mt-3 max-h-32 overflow-y-auto border rounded-sm p-3 font-mono text-xs" style={{ borderColor: 'var(--color-hairline)', backgroundColor: '#fafafa' }}>
              {sustentoLogs.map((log, i) => (
                <p key={i} className="py-0.5" style={{ color: 'var(--color-body)' }}>{log}</p>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Results section */}
      <section className="border rounded-md p-5" style={{ borderColor: 'var(--color-hairline)' }}>
        <h2 className="text-xs font-medium uppercase tracking-[1.5px] mb-4" style={{ color: 'var(--color-mute)' }}>
          {t('resultsTitle')}
        </h2>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium" style={{ color: 'var(--color-accent-green)' }}>
            ● {t('analysisComplete')}
          </span>
          {completedAt && (
            <span className="text-xs" style={{ color: 'var(--color-mute)' }} suppressHydrationWarning>{completedAt}</span>
          )}
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-bold" style={{ color: 'var(--color-ink)' }}>
            {compliancePercent}%
          </span>
          <span className="text-sm" style={{ color: 'var(--color-mute)' }}>
            {t('compliance')}
          </span>
        </div>

        <div className="w-full h-2 rounded-full mb-4" style={{ backgroundColor: 'var(--color-hairline)' }}>
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${Math.min(parseFloat(compliancePercent), 100)}%`,
              backgroundColor: parseFloat(compliancePercent) >= 70 ? 'var(--color-accent-green)' : parseFloat(compliancePercent) >= 40 ? '#f59e0b' : 'var(--color-accent-red)',
            }}
          />
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          <div className="border rounded-sm p-3" style={{ borderColor: 'var(--color-hairline)' }}>
            <dt className="text-xs mb-1" style={{ color: 'var(--color-mute)' }}>{t('documentsCount')}</dt>
            <dd className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>{sustentoDocs.length}</dd>
          </div>
          <div className="border rounded-sm p-3" style={{ borderColor: 'var(--color-hairline)' }}>
            <dt className="text-xs mb-1" style={{ color: 'var(--color-mute)' }}>{t('totalReqs')}</dt>
            <dd className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>{totalRequirements}</dd>
          </div>
          <div className="border rounded-sm p-3" style={{ borderColor: 'var(--color-hairline)' }}>
            <dt className="text-xs mb-1" style={{ color: 'var(--color-mute)' }}>{t('found')}</dt>
            <dd className="text-lg font-semibold" style={{ color: 'var(--color-accent-green)' }}>{effectiveFoundCount}</dd>
            <dd className="text-[10px] mt-0.5" style={{ color: 'var(--color-mute)' }}>
              {analysisFoundCount} {t('byAnalysis')} + {sustentoCount} {t('bySustento')}
            </dd>
          </div>
          <div className="border rounded-sm p-3" style={{ borderColor: 'var(--color-hairline)' }}>
            <dt className="text-xs mb-1" style={{ color: 'var(--color-mute)' }}>{t('notFound')}</dt>
            <dd className="text-lg font-semibold" style={{ color: 'var(--color-accent-red)' }}>{effectiveNotFoundCount}</dd>
          </div>
        </dl>

        {/* Unfound requirements table */}
        {unfoundRequirements.length > 0 && (
          <UnfoundRequirementsTable
            requirements={unfoundRequirements}
            analysisId={analysisId}
            projectId={projectId}
            onSustentoChange={(count) => setSustentoCount(count)}
            reloadTrigger={reloadTrigger}
          />
        )}

        {/* Generate Carpeta Digital */}
        <div className="flex items-center gap-3 flex-wrap pt-4 border-t" style={{ borderColor: 'var(--color-hairline)' }}>
          <button
            type="button"
            disabled={carpetaLoading}
            onClick={handleGenerateCarpeta}
            className="inline-flex items-center gap-2 rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#8b5cf6', color: 'white' }}
          >
            {carpetaLoading ? t('generating') : (carpetaUrl ? t('regenerateCarpeta') : t('generateCarpeta'))}
          </button>

          {carpetaUrl && (
            <a
              href={`/api/download?url=${encodeURIComponent(carpetaUrl)}`}
              download
              className="inline-flex items-center gap-2 rounded-sm px-5 py-3 text-sm font-medium border transition-colors hover:bg-gray-50"
              style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }}
            >
              {t('downloadCarpeta')}
            </a>
          )}

          {carpetaError && (
            <span className="text-xs" style={{ color: 'var(--color-accent-red)' }}>{carpetaError}</span>
          )}
        </div>
      </section>

    </div>
  )
}
