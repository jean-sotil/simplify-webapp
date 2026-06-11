'use client'

import { useRef, useState, useCallback } from 'react'
import { upload } from '@vercel/blob/client'
import { indexUploadedDocument } from '@/app/[lang]/documents/actions'

interface DocumentUploaderProps {
  teamId: string
  lang: string
}

interface FileEntry {
  file: File
  documentType: 'ett' | 'hardware'
  status: 'pending' | 'uploading' | 'success' | 'warning' | 'error'
  message?: string
}

export function DocumentUploader({ teamId: _teamId, lang: _lang }: DocumentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [defaultDocType, setDefaultDocType] = useState<'ett' | 'hardware'>('hardware')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const validateFile = useCallback((file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return `${file.name}: Only PDF files are accepted.`
    }
    if (file.size > 50 * 1024 * 1024) {
      return `${file.name}: File must be 50 MB or smaller.`
    }
    return null
  }, [])

  function addFiles(newFiles: FileList | File[]) {
    const entries: FileEntry[] = []
    const errors: string[] = []

    for (const file of Array.from(newFiles)) {
      const error = validateFile(file)
      if (error) {
        errors.push(error)
      } else {
        // Avoid duplicates by name+size
        const isDuplicate = files.some(
          (f) => f.file.name === file.name && f.file.size === file.size
        )
        if (!isDuplicate) {
          entries.push({ file, documentType: defaultDocType, status: 'pending' })
        }
      }
    }

    if (errors.length > 0) {
      // Show errors as rejected entries
      for (const errMsg of errors) {
        entries.push({
          file: new File([], errMsg.split(':')[0]),
          documentType: defaultDocType,
          status: 'error',
          message: errMsg,
        })
      }
    }

    setFiles((prev) => [...prev, ...entries])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      e.target.value = '' // reset so same files can be re-selected
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function updateFileType(index: number, type: 'ett' | 'hardware') {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, documentType: type } : f))
    )
  }

  async function handleUploadAll() {
    const pendingFiles = files.filter((f) => f.status === 'pending')
    if (pendingFiles.length === 0) return

    setIsUploading(true)

    // Process sequentially to avoid overwhelming the API
    for (let i = 0; i < files.length; i++) {
      const entry = files[i]
      if (entry.status !== 'pending') continue

      // Mark as uploading
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' } : f))
      )

      try {
        // Step 1: Upload file directly to Vercel Blob (client → Blob, bypasses 4.5MB limit)
        const blob = await upload(entry.file.name, entry.file, {
          access: 'public',
          handleUploadUrl: '/api/documents/upload',
        })

        // Step 2: Server action indexes the uploaded file (text extraction + embeddings)
        const result = await indexUploadedDocument({
          blobUrl: blob.url,
          filename: entry.file.name,
          documentType: entry.documentType,
        })

        if ('error' in result && result.error) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i
                ? { ...f, status: 'error', message: typeof result.error === 'string' ? result.error : 'Upload failed.' }
                : f
            )
          )
        } else if ('warning' in result && result.warning) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: 'warning', message: result.warning } : f
            )
          )
        } else {
          setFiles((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, status: 'success' } : f))
          )
        }
      } catch {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'error', message: 'Network error' } : f
          )
        )
      }
    }

    setIsUploading(false)
  }

  function clearCompleted() {
    setFiles((prev) => prev.filter((f) => f.status === 'pending'))
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length
  const completedCount = files.filter((f) => f.status === 'success' || f.status === 'warning').length

  return (
    <div aria-label="Upload documents">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Click or drag PDFs to upload"
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
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="sr-only"
          aria-label="Select PDF files"
          onChange={handleFileInputChange}
          disabled={isUploading}
        />
        <p className="text-sm" style={{ color: 'var(--color-mute)' }}>
          Drag &amp; drop PDFs here, or click to select
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-mute)' }}>
          Multiple files supported • Max 50 MB each
        </p>
      </div>

      {/* Default document type for new files */}
      <div className="mb-4">
        <label
          htmlFor="default-doc-type"
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--color-ink)' }}
        >
          Default type for new files
        </label>
        <select
          id="default-doc-type"
          value={defaultDocType}
          onChange={(e) => setDefaultDocType(e.target.value as 'ett' | 'hardware')}
          disabled={isUploading}
          className="w-full border rounded-sm px-4 py-3 text-sm bg-white focus:outline-none"
          style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        >
          <option value="ett">ETT (Engineering Technical Spec)</option>
          <option value="hardware">Hardware Inventory</option>
        </select>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mb-4 space-y-2">
          {files.map((entry, index) => (
            <div
              key={`${entry.file.name}-${index}`}
              className="flex items-center gap-3 border rounded-sm px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-hairline)' }}
            >
              {/* Status indicator */}
              <span className="flex-shrink-0 w-5 text-center">
                {entry.status === 'pending' && '📄'}
                {entry.status === 'uploading' && (
                  <span className="inline-block animate-spin">⏳</span>
                )}
                {entry.status === 'success' && '✅'}
                {entry.status === 'warning' && '⚠️'}
                {entry.status === 'error' && '❌'}
              </span>

              {/* Filename */}
              <span
                className="flex-1 truncate"
                style={{ color: 'var(--color-ink)' }}
                title={entry.file.name}
              >
                {entry.file.name}
                {entry.file.size > 0 && (
                  <span className="ml-1" style={{ color: 'var(--color-mute)' }}>
                    ({(entry.file.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                )}
              </span>

              {/* Type selector (only for pending files) */}
              {entry.status === 'pending' && (
                <select
                  value={entry.documentType}
                  onChange={(e) => updateFileType(index, e.target.value as 'ett' | 'hardware')}
                  className="border rounded-sm px-2 py-1 text-xs bg-white"
                  style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                  aria-label={`Document type for ${entry.file.name}`}
                >
                  <option value="ett">ETT</option>
                  <option value="hardware">Hardware</option>
                </select>
              )}

              {/* Message */}
              {entry.message && (
                <span
                  className="text-xs max-w-[200px] truncate"
                  style={{
                    color: entry.status === 'error'
                      ? 'var(--color-accent-red)'
                      : 'var(--color-accent-yellow)',
                  }}
                  title={entry.message}
                >
                  {entry.message}
                </span>
              )}

              {/* Remove button (only for pending/error) */}
              {(entry.status === 'pending' || entry.status === 'error') && (
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-xs px-1 hover:opacity-70"
                  style={{ color: 'var(--color-mute)' }}
                  aria-label={`Remove ${entry.file.name}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleUploadAll}
          disabled={pendingCount === 0 || isUploading}
          className="flex-1 rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          aria-busy={isUploading}
        >
          {isUploading
            ? 'Uploading…'
            : `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}`}
        </button>

        {completedCount > 0 && (
          <button
            type="button"
            onClick={clearCompleted}
            className="rounded-sm px-4 py-3 text-sm border hover:opacity-70"
            style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-mute)' }}
          >
            Clear done
          </button>
        )}
      </div>
    </div>
  )
}
