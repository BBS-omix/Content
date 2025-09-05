export default function Storyboard({ segments }) {
  if (!segments?.length) return null
  return (
    <div className="mt-3">
      <div className="text-xs text-white/60 mb-2">Storyboard</div>
      <div className="grid grid-cols-3 gap-2">
        {segments.map((s, i)=>(
          <div key={i} className="rounded border border-white/10 bg-black/30 p-2 h-20 overflow-hidden">
            <div className="text-[10px] text-white/50">#{i+1}</div>
            <div className="text-xs leading-tight line-clamp-3">{s || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
