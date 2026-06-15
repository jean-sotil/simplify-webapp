'use client'

import dynamic from 'next/dynamic'

const PdfViewer = dynamic(
  () => import('@/components/documents/PdfViewer').then(m => m.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="border rounded-md p-6 text-center" style={{ borderColor: 'var(--color-hairline)' }}>
        <p className="text-sm" style={{ color: 'var(--color-mute)' }}>Loading viewer...</p>
      </div>
    ),
  }
)

interface Props {
  url: string
}

export function PdfViewerWrapper({ url }: Props) {
  return <PdfViewer url={url} />
}
