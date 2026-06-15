'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { PdfViewerWrapper } from './PdfViewerWrapper'

interface DocumentActionsProps {
  pdfUrl: string
  documentId: string
  lang: string
}

export function DocumentActions({ pdfUrl, documentId, lang }: DocumentActionsProps) {
  const t = useTranslations('documentDetail')
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div>
      {/* Action buttons */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setShowPreview(v => !v)}
          className="text-sm font-medium px-4 py-2 rounded-sm border transition-colors hover:opacity-90"
          style={{
            backgroundColor: showPreview ? 'var(--color-primary)' : 'transparent',
            color: showPreview ? 'var(--color-on-primary)' : 'var(--color-ink)',
            borderColor: showPreview ? 'var(--color-primary)' : 'var(--color-hairline)',
          }}
        >
          {showPreview ? t('hidePreview') : t('showPreview')}
        </button>

        <a
          href={`/api/download?url=${encodeURIComponent(pdfUrl)}`}
          className="text-sm font-medium px-4 py-2 rounded-sm border transition-colors hover:bg-gray-50"
          style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        >
          {t('download')}
        </a>

        <form
          className="ml-auto"
        >
          <input type="hidden" name="documentId" value={documentId} />
          <button
            type="button"
            className="text-sm font-medium px-4 py-2 rounded-sm border transition-colors hover:bg-red-50"
            style={{ borderColor: 'var(--color-accent-red)', color: 'var(--color-accent-red)' }}
            onClick={async () => {
              if (!confirm(t('confirmDelete'))) return
              const res = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' })
              if (res.ok) {
                window.location.href = `/${lang}/documents`
              }
            }}
          >
            {t('deleteDocument')}
          </button>
        </form>
      </div>

      {/* PDF Viewer (lazy, toggled) */}
      {showPreview && (
        <section className="mb-6" aria-labelledby="pdf-viewer-heading">
          <PdfViewerWrapper url={`/api/download?url=${encodeURIComponent(pdfUrl)}&inline=1`} />
        </section>
      )}
    </div>
  )
}
