'use client'

import { useState, useRef } from 'react'
import { Worker, Viewer } from '@react-pdf-viewer/core'
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout'

import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'

interface PdfViewerProps {
  url: string
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const defaultLayoutPluginInstance = defaultLayoutPlugin()

  // Hide Open, Download, and the built-in fullscreen buttons via CSS
  const hideButtonsStyle = `
    .rpv-open__input-wrapper,
    .rpv-get-file__download-button,
    [data-testid="open__button"],
    [data-testid="get-file__download-button"],
    button[aria-label="Open file"],
    button[aria-label="Download"],
    button[aria-label="Full screen"],
    button[aria-label="Enter fullscreen"] {
      display: none !important;
    }
  `

  return (
    <>
      <style>{hideButtonsStyle}</style>
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

        <div style={{ height: 'calc(100% - 33px)' }}>
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <Viewer
              fileUrl={url}
              plugins={[defaultLayoutPluginInstance]}
            />
          </Worker>
        </div>
      </div>
    </>
  )
}
