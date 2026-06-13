'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import * as Dialog from '@radix-ui/react-dialog'
import { attachDocumentToProject } from '@/app/[lang]/projects/[id]/actions'

interface Document {
  id: string
  filename: string
  document_type: string
}

interface AttachDocumentsDialogProps {
  projectId: string
  availableDocuments: Document[]
}

export function AttachDocumentsDialog({
  projectId,
  availableDocuments,
  
}: AttachDocumentsDialogProps) {
  const t = useTranslations('projects.attach')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleAttach() {
    if (selected.size === 0) return
    setError('')
    startTransition(async () => {
      const ids = Array.from(selected)
      const results = await Promise.all(
        ids.map(docId => attachDocumentToProject(projectId, docId))
      )
      const failed = results.find(r => 'error' in r && r.error)
      if (failed && 'error' in failed) {
        setError(typeof failed.error === 'string' ? failed.error : 'Attach failed')
        return
      }
      setSelected(new Set())
      setOpen(false)
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="rounded-sm px-4 py-2 text-sm font-medium border transition-colors hover:bg-gray-50"
          style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        >
          {t('trigger')}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md bg-white p-6 shadow-xl focus:outline-none"
          style={{ border: '1px solid var(--color-hairline)' }}
        >
          <Dialog.Title
            className="text-base font-semibold mb-1"
            style={{ color: 'var(--color-ink)' }}
          >
            {t('title')}
          </Dialog.Title>
          <Dialog.Description
            className="text-sm mb-4"
            style={{ color: 'var(--color-mute)' }}
          >
            {t('description')}
          </Dialog.Description>

          {availableDocuments.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--color-mute)' }}>
              {t('allAttached')}
            </p>
          ) : (
            <fieldset className="mb-4">
              <legend className="sr-only">Available documents</legend>
              <ul
                className="max-h-60 overflow-y-auto space-y-1 border rounded-sm p-2"
                style={{ borderColor: 'var(--color-hairline)' }}
              >
                {availableDocuments.map(doc => (
                  <li key={doc.id}>
                    <label className="flex items-center gap-3 px-2 py-2 rounded-sm cursor-pointer hover:bg-gray-50 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.has(doc.id)}
                        onChange={() => toggle(doc.id)}
                        aria-label={`Attach ${doc.filename}`}
                        className="shrink-0"
                      />
                      <span
                        className="flex-1 min-w-0 text-sm break-all leading-tight"
                        style={{ color: 'var(--color-ink)' }}
                        title={doc.filename}
                      >
                        {doc.filename}
                      </span>
                      <span
                        className="text-xs uppercase shrink-0 ml-2"
                        style={{ color: 'var(--color-mute)' }}
                      >
                        {doc.document_type}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}

          {error && (
            <p role="alert" className="text-xs mb-3" style={{ color: 'var(--color-accent-red)' }}>
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-sm px-4 py-2 rounded-sm border"
                style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
              >
                {t('cancel')}
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleAttach}
              disabled={selected.size === 0 || isPending}
              className="rounded-sm px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
              aria-busy={isPending}
            >
              {isPending ? 'Attaching…' : `Attach${selected.size > 0 ? ` (${selected.size})` : ''}`}
            </button>
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close dialog"
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-sm hover:bg-gray-100"
              style={{ color: 'var(--color-mute)' }}
            >
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
