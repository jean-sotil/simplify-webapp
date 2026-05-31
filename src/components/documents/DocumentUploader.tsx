'use client'

import { useRef, useState } from 'react'
import { uploadDocument } from '@/app/[lang]/documents/actions'

interface DocumentUploaderProps {
  teamId: string
  lang: string
}

export function DocumentUploader({ teamId, lang: _lang }: DocumentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<'ett' | 'hardware'>('ett')
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  function handleFileSelect(selected: File | null) {
    if (!selected) return
    if (selected.type !== 'application/pdf') {
      setStatus('error')
      setErrorMessage('Only PDF files are accepted.')
      setFile(null)
      return
    }
    if (selected.size > 50 * 1024 * 1024) {
      setStatus('error')
      setErrorMessage('File must be 50 MB or smaller.')
      setFile(null)
      return
    }
    setFile(selected)
    setStatus('idle')
    setErrorMessage('')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files[0] ?? null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setStatus('uploading')
    setErrorMessage('')

    const formData = new FormData()
    formData.set('file', file)
    formData.set('documentType', documentType)
    formData.set('teamId', teamId)

    const result = await uploadDocument(formData)

    if ('error' in result && result.error) {
      setStatus('error')
      setErrorMessage(typeof result.error === 'string' ? result.error : 'Upload failed.')
    } else {
      setStatus('success')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Upload document">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Click or drag a PDF to upload"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={[
          'border-2 border-dashed rounded-md px-8 py-10 text-center cursor-pointer transition-colors mb-4',
          isDragOver
            ? 'border-[var(--color-primary)] bg-gray-50'
            : 'border-[var(--color-hairline)] hover:border-[var(--color-primary)]',
        ].join(' ')}
      >
        <input
          ref={fileInputRef}
          id="file-input"
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          aria-label="Select PDF file"
          onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
          disabled={status === 'uploading'}
        />
        {file ? (
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            {file.name}{' '}
            <span style={{ color: 'var(--color-mute)' }}>
              ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </span>
          </p>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-mute)' }}>
            Drag &amp; drop a PDF here, or click to select
          </p>
        )}
      </div>

      {/* Document type selector */}
      <div className="mb-4">
        <label
          htmlFor="doc-type"
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--color-ink)' }}
        >
          Document type
        </label>
        <select
          id="doc-type"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as 'ett' | 'hardware')}
          disabled={status === 'uploading'}
          className="w-full border rounded-sm px-4 py-3 text-sm bg-white focus:outline-none"
          style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        >
          <option value="ett">ETT (Engineering Technical Spec)</option>
          <option value="hardware">Hardware Inventory</option>
        </select>
      </div>

      {/* Feedback messages */}
      {status === 'error' && (
        <p
          role="alert"
          aria-live="assertive"
          className="mb-4 text-xs"
          style={{ color: 'var(--color-accent-red)' }}
        >
          {errorMessage}
        </p>
      )}
      {status === 'success' && (
        <p
          role="status"
          aria-live="polite"
          className="mb-4 text-xs"
          style={{ color: 'var(--color-accent-green)' }}
        >
          Document uploaded and indexed successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={!file || status === 'uploading'}
        className="w-full rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
        aria-busy={status === 'uploading'}
      >
        {status === 'uploading' ? 'Uploading…' : 'Upload document'}
      </button>
    </form>
  )
}
