export default function ProjectsLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8" aria-label="Loading projects" aria-busy="true">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-3 w-16 rounded bg-gray-100 animate-pulse mb-2" />
          <div className="h-8 w-48 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="h-10 w-32 rounded-sm bg-gray-100 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border rounded-md p-8 animate-pulse"
            style={{ borderColor: 'var(--color-hairline)' }}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="h-4 w-32 rounded bg-gray-100" />
              <div className="h-6 w-20 rounded-sm bg-gray-100 shrink-0" />
            </div>
            <div className="h-3 w-full rounded bg-gray-100 mb-2" />
            <div className="h-3 w-3/4 rounded bg-gray-100 mb-6" />
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-gray-100" />
              <div className="h-3 w-20 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
