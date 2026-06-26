'use client'

import { useState, useRef } from 'react'

interface PdfViewerProps {
  url: string
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={containerRef}
      className={isExpanded ? 'fixed inset-0 z-50 bg-white' : ''}
      style={isExpanded ? { height: '100vh' } : { height: '70vh', border: '1px solid var(--color-hairline)', borderRadius: '6px' }}
    >
      {/* Expand/Collapse toggle */}
      <div
        className="flex justify-end px-2 py-1"
        style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid var(--color-hairline)' }}
      >
        <button
          type="button"
          onClick={() => setIsExpanded(v => !v)}
          className="text-xs px-3 py-1 rounded-sm border hover:bg-gray-100"
          style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        >
          {isExpanded ? '✕ Exit fullscreen' : '⛶ Fullscreen'}
        </button>
      </div>

      <iframe
        src={url}
        title="PDF Preview"
        className="w-full border-0"
        style={{ height: 'calc(100% - 33px)' }}
      />
    </div>
  )
}
