interface Props {
  loading: boolean
  error: string | null
  onRetry: () => void
}

export default function ApiStatus({ loading, error, onRetry }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 gap-3">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3">
        <p className="text-amber-400 text-sm">
          {error.includes('Network') || error.includes('timeout')
            ? 'Cannot connect to server - showing last known data'
            : error}
        </p>
        <button onClick={onRetry} className="btn btn-secondary btn-sm">
          Retry
        </button>
      </div>
    )
  }

  return null
}
