'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface UnfoundReq {
  requirementId: string
  text: string
  partida: string
  partidaDesc: string
}

interface SustentoLink {
  id: string
  document_id: string
  requirement_ids: string[]
  documents: { id: string; filename: string } | null
}

interface Props {
  requirements: UnfoundReq[]
  analysisId: string
  projectId: string
  onSustentoChange?: (count: number) => void
  reloadTrigger?: number
}

export function UnfoundRequirementsTable({ requirements, analysisId, projectId, onSustentoChange, reloadTrigger }: Props) {
  const t = useTranslations('analysis')
  const [showTable, setShowTable] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tableSearch, setTableSearch] = useState('')
  const [sustentoLinks, setSustentoLinks] = useState<SustentoLink[]>([])
  const [sustentoDocuments, setSustentoDocuments] = useState<Array<{ id: string; filename: string }>>([])
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [references, setReferences] = useState<Map<string, { documentId: string; filename: string }>>(new Map())

  // Build references from sustento_links (only show refs for linked requirements)
  useEffect(() => {
    const refMap = new Map<string, { documentId: string; filename: string }>()
    for (const link of sustentoLinks) {
      const doc = link.documents
      if (!doc) continue
      for (const reqId of link.requirement_ids) {
        refMap.set(reqId, { documentId: doc.id, filename: doc.filename })
      }
    }
    setReferences(refMap)
  }, [sustentoLinks])

  // Unlink a requirement from its sustento
  async function handleUnlinkReq(reqId: string) {
    // Find which link contains this requirement
    const link = sustentoLinks.find(l => l.requirement_ids.includes(reqId))
    if (!link) return

    const newReqIds = link.requirement_ids.filter(id => id !== reqId)

    if (newReqIds.length === 0) {
      // Delete the entire link
      await fetch(`/api/sustento-links?id=${link.id}`, { method: 'DELETE' })
    } else {
      // Update the link with the remaining requirement_ids
      await fetch('/api/sustento-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: link.id, requirementIds: newReqIds }),
      })
    }

    // Reload links
    const linksRes = await fetch(`/api/sustento-links?projectId=${projectId}`)
    if (linksRes.ok) {
      const data = await linksRes.json()
      setSustentoLinks(data.links ?? [])
    }
  }

  // Load existing sustento links
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sustento-links?projectId=${projectId}`)
        if (res.ok) {
          const data = await res.json()
          setSustentoLinks(data.links ?? [])
        }
      } catch { /* ignore */ }
    }
    load()
  }, [projectId, reloadTrigger])

  // Load available sustento documents
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/documents')
        if (res.ok) {
          const data = await res.json()
          const docs = (data.documents || []).filter((d: { document_type: string }) => d.document_type === 'sustento')
          setSustentoDocuments(docs)
        }
      } catch { /* ignore */ }
    }
    load()
  }, [])

  function toggleSelect(reqId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(reqId)) next.delete(reqId)
      else next.add(reqId)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(sortedRequirements.filter(r => !coveredReqIds.has(r.requirementId)).map(r => r.requirementId)))
  }

  function deselectAll() {
    setSelected(new Set())
  }

  async function handleAttachSustento(documentId: string) {
    setAttaching(true)
    try {
      const res = await fetch('/api/sustento-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          projectId,
          documentId,
          requirementIds: Array.from(selected),
        }),
      })
      if (res.ok) {
        // Reload links
        const linksRes = await fetch(`/api/sustento-links?projectId=${projectId}`)
        if (linksRes.ok) {
          const data = await linksRes.json()
          setSustentoLinks(data.links ?? [])
        }
        setSelected(new Set())
        setShowAttachModal(false)
      }
    } catch { /* ignore */ }
    setAttaching(false)
  }

  // Get which requirements are already covered by sustento
  const coveredReqIds = new Set<string>()
  for (const link of sustentoLinks) {
    for (const reqId of link.requirement_ids) {
      coveredReqIds.add(reqId)
    }
  }

  // Notify parent of sustento count changes
  useEffect(() => {
    onSustentoChange?.(coveredReqIds.size)
  }, [sustentoLinks]) // eslint-disable-line react-hooks/exhaustive-deps

  const sortedRequirements = [...requirements]
    .sort((a, b) => {
      const numA = parseInt(a.requirementId.replace(/\D/g, ''), 10)
      const numB = parseInt(b.requirementId.replace(/\D/g, ''), 10)
      return numA - numB
    })
    .filter(req => {
      if (!tableSearch.trim()) return true
      const q = tableSearch.toLowerCase()
      return req.requirementId.toLowerCase().includes(q) ||
        (req.partida || '').toLowerCase().includes(q) ||
        (req.text || '').toLowerCase().includes(q)
    })

  if (requirements.length === 0) return null

  return (
    <div className="mb-5 border rounded-sm" style={{ borderColor: 'var(--color-hairline)' }}>
      <button
        type="button"
        onClick={() => setShowTable(!showTable)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
        style={{ color: 'var(--color-ink)' }}
      >
        <span>{t('unfoundRequirements')} ({requirements.length - coveredReqIds.size})</span>
        <span className="text-xs" style={{ color: 'var(--color-mute)' }}>
          {showTable ? '▲' : '▼'}
        </span>
      </button>

      {showTable && (
        <div className="border-t" style={{ borderColor: 'var(--color-hairline)' }}>
          {/* Actions bar */}
          <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: 'var(--color-hairline)', backgroundColor: '#fafafa' }}>
            {/* Search filter */}
            <input
              type="text"
              value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
              placeholder={t('filterByIdPartidaReq')}
              className="border rounded-sm px-2 py-1 text-xs flex-1 focus:outline-none"
              style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
            />
            <button
              type="button"
              onClick={selected.size === sortedRequirements.length ? deselectAll : selectAll}
              className="text-xs hover:underline"
              style={{ color: 'var(--color-primary)' }}
            >
              {selected.size === sortedRequirements.length ? t('deselectAll') : t('selectAll')}
            </button>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => setShowAttachModal(true)}
                className="text-xs px-3 py-1 rounded-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#8b5cf6', color: 'white' }}
              >
                {t('attachSustento')} ({selected.size})
              </button>
            )}
            {coveredReqIds.size > 0 && (
              <span className="text-xs ml-auto" style={{ color: 'var(--color-accent-green)' }}>
                ● {coveredReqIds.size} {t('coveredBySustento')}
              </span>
            )}
          </div>

          {/* Table */}
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-hairline)', backgroundColor: '#fafafa' }}>
                  <th className="w-8 px-2 py-2"></th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-mute)' }}>ID</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-mute)' }}>{t('partidaCol')}</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-mute)' }}>{t('requirementCol')}</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-mute)' }}>{t('statusCol')}</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-mute)' }}>{t('referenceCol')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedRequirements.map((req) => {
                  const isCovered = coveredReqIds.has(req.requirementId)
                  return (
                    <tr
                      key={req.requirementId}
                      className="border-b last:border-b-0"
                      style={{ borderColor: 'var(--color-hairline)', backgroundColor: isCovered ? '#f0fdf4' : undefined }}
                    >
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selected.has(req.requirementId)}
                          onChange={() => toggleSelect(req.requirementId)}
                          disabled={isCovered}
                          aria-label={`Select ${req.requirementId}`}
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono" style={{ color: 'var(--color-mute)' }}>
                        {req.requirementId}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--color-body)' }}>
                        {req.partida || '-'}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--color-body)' }}>
                        {req.text || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {isCovered ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-sm bg-violet-100 text-violet-700">
                              Sustento
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUnlinkReq(req.requirementId)}
                              className="text-xs hover:underline"
                              style={{ color: 'var(--color-accent-red)' }}
                              title="Desvincular"
                            >
                              ✕
                            </button>
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--color-accent-red)' }}>
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {references.has(req.requirementId) ? (
                          <a
                            href={`/es/documents/${references.get(req.requirementId)!.documentId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs hover:underline"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            {references.get(req.requirementId)!.filename.substring(0, 30)}
                            {references.get(req.requirementId)!.filename.length > 30 ? '...' : ''}
                          </a>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--color-mute)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Attach modal */}
          {showAttachModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="bg-white rounded-md shadow-xl p-6 w-full max-w-md mx-4">
                <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--color-ink)' }}>
                  {t('selectSustentoDoc')}
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--color-mute)' }}>
                  {t('attachSustentoDesc', { count: selected.size })}
                </p>

                {sustentoDocuments.length === 0 ? (
                  <p className="text-sm py-4" style={{ color: 'var(--color-body)' }}>
                    {t('noSustentoAvailable')}
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto mb-4">
                    {sustentoDocuments.map(doc => (
                      <li key={doc.id}>
                        <button
                          type="button"
                          disabled={attaching}
                          onClick={() => handleAttachSustento(doc.id)}
                          className="w-full text-left px-3 py-2 rounded-sm border hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
                          style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                        >
                          {doc.filename}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={() => setShowAttachModal(false)}
                  className="text-sm hover:underline"
                  style={{ color: 'var(--color-mute)' }}
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
