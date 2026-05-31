export default function DocumentsLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8" aria-label="Loading documents" aria-busy="true">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="h-3 w-20 rounded bg-gray-100 animate-pulse mb-2" />
          <div className="h-8 w-52 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="h-4 w-32 rounded bg-gray-100 animate-pulse" />
      </div>

      {/* Upload section skeleton */}
      <div className="mb-10">
        <div className="h-3 w-36 rounded bg-gray-100 animate-pulse mb-4" />
        <div
          className="max-w-lg border-2 border-dashed rounded-md py-10 flex items-center justify-center animate-pulse"
          style={{ borderColor: 'var(--color-hairline)' }}
        >
          <div className="h-4 w-48 rounded bg-gray-100" />
        </div>
      </div>

      {/* List skeleton */}
      <div>
        <div className="h-3 w-28 rounded bg-gray-100 animate-pulse mb-4" />
        <ul className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center justify-between border rounded-md px-4 py-3 animate-pulse"
              style={{ borderColor: 'var(--color-hairline)' }}
            >
              <div className="flex items-center gap-3">
                <div className="h-6 w-14 rounded-sm bg-gray-100 shrink-0" />
                <div className="h-4 w-48 rounded bg-gray-100" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-14 rounded bg-gray-100" />
                <div className="h-3 w-20 rounded bg-gray-100" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
