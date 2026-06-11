'use client'

import { useRef, useState, useCallback } from 'react'
import { upload } from '@vercel/blob/client'
import { uploadDocument, indexUploadedDocument } from '@/app/[lang]/documents/actions'

interface DocumentUploaderProps {
  teamId: string
  lang: string
}

interface FileEntry {
  file: File
  documentType: 'ett' | 'hardware' | 'software'
  status: 'pending' | 'uploading' | 'success' | 'warning' | 'error'
  message?: string
}

// Files under this size go via Server Action (simpler, faster)
const DIRECT_UPLOAD_LIMIT = 4 * 1024 * 1024 // 4 MB

// Vercel Fluid Compute enables larger body sizes for Server Actions
export function DocumentUploader({ teamId, lang: _lang }: DocumentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [defaultDocType, setDefaultDocType] = useState<'ett' | 'hardware' | 'software'>('hardware')
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
        const isDuplicate = files.some(
          (f) => f.file.name === file.name && f.file.size === file.size
        )
        if (!isDuplicate) {
          entries.push({ file, documentType: defaultDocType, status: 'pending' })
        }
      }
    }

    if (errors.length > 0) {
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
      e.target.value = ''
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function updateFileType(index: number, type: 'ett' | 'hardware' | 'software') {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, documentType: type } : f))
    )
  }

  async function uploadSingleFile(entry: FileEntry): Promise<{ error?: string; warning?: string }> {
    if (entry.file.size <= DIRECT_UPLOAD_LIMIT) {
      // Small file: Server Action directly
      const formData = new FormData()
      formData.set('file', entry.file)
      formData.set('documentType', entry.documentType)
      formData.set('teamId', teamId)

      const result = await uploadDocument(formData)
      if ('error' in result && result.error) {
        return { error: typeof result.error === 'string' ? result.error : 'Upload failed.' }
      }
      if ('warning' in result && result.warning) {
        return { warning: result.warning }
      }
      return {}
    }

    // Large file: client upload to Blob, then index via Server Action
    // 1. Upload via SDK's upload() which handles token exchange + CORS internally
    const blob = await upload(entry.file.name, entry.file, {
      access: 'private',
      handleUploadUrl: '/api/documents/upload',
    })

    // 2. Index the uploaded file (text extraction + embeddings)
    const result = await indexUploadedDocument({
      blobUrl: blob.url,
      filename: entry.file.name,
      documentType: entry.documentType,
    })

    if ('error' in result && result.error) {
      return { error: typeof result.error === 'string' ? result.error : 'Indexing failed.' }
    }
    if ('warning' in result && result.warning) {
      return { warning: result.warning }
    }
    return {}
  }

  async function handleUploadAll() {
    const pendingFiles = files.filter((f) => f.status === 'pending')
    if (pendingFiles.length === 0) return

    setIsUploading(true)

    for (let i = 0; i < files.length; i++) {
      const entry = files[i]
      if (entry.status !== 'pending') continue

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' } : f))
      )

      try {
        const result = await uploadSingleFile(entry)

        if (result.error) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: 'error', message: result.error } : f
            )
          )
        } else if (result.warning) {
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
      } catch (err) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'error', message: err instanceof Error ? err.message : 'Network error' }
              : f
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
          onChange={(e) => setDefaultDocType(e.target.value as 'ett' | 'hardware' | 'software')}
          disabled={isUploading}
          className="w-full border rounded-sm px-4 py-3 text-sm bg-white focus:outline-none"
          style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        >
          <option value="ett">ETT (Engineering Technical Spec)</option>
          <option value="hardware">Hardware Inventory</option>
          <option value="software">Software Inventory</option>
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
              <span className="flex-shrink-0 w-5 text-center">
                {entry.status === 'pending' && '📄'}
                {entry.status === 'uploading' && (
                  <span className="inline-block animate-spin">⏳</span>
                )}
                {entry.status === 'success' && '✅'}
                {entry.status === 'warning' && '⚠️'}
                {entry.status === 'error' && '❌'}
              </span>

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

              {entry.status === 'pending' && (
                <select
                  value={entry.documentType}
                  onChange={(e) => updateFileType(index, e.target.value as 'ett' | 'hardware' | 'software')}
                  className="border rounded-sm px-2 py-1 text-xs bg-white"
                  style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                  aria-label={`Document type for ${entry.file.name}`}
                >
                  <option value="ett">ETT</option>
                  <option value="hardware">Hardware</option>
                  <option value="software">Software</option>
                </select>
              )}

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
