export function parseNumLoose(v, fallback = 0){
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v !== 'string') return fallback
  const s = v.replace(',', '.').trim()
  const n = Number(s)
  return Number.isFinite(n) ? n : fallback
}

export function segmentText(text, mode, segments){
  const t = (text||'').replace(/\s+/g,' ').trim()
  if(!t) return []
  if (mode==='sentence') {
    const parts = t.split(/(?<=[\.\!\?])\s+/).filter(Boolean)
    if (parts.length <= segments) return parts
    // squash/merge to target count
    const out = []
    const step = Math.ceil(parts.length/segments)
    for (let i=0;i<segments;i++) out.push(parts.slice(i*step,(i+1)*step).join(' '))
    return out
  }
  if (mode==='word') {
    const words = t.split(' ').filter(Boolean)
    const per = Math.ceil(words.length/segments)
    const out = []
    for (let i=0; i<segments; i++) out.push(words.slice(i*per,(i+1)*per).join(' '))
    return out
  }
  // even (rough chunks by char)
  const chars = Math.max(segments,1)
  const size = Math.ceil(t.length/chars)
  const out=[]
  for (let i=0;i<segments;i++) out.push(t.slice(i*size,(i+1)*size))
  return out
}
