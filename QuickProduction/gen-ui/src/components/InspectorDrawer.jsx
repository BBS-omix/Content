import { useEffect, useMemo, useState } from 'react'
import { API } from '../api'
import { parseNumLoose, segmentText } from '../shared/utils'
import Storyboard from './Storyboard'

export default function InspectorDrawer({ openId, item, onClose, onSave }) {
  const [local, setLocal] = useState(item)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isVideo, setIsVideo] = useState(false)

  // storyboard controls
  const [segmentsCount, setSegmentsCount] = useState(item?.segmentsCount ?? 6)
  const [segmentMode, setSegmentMode] = useState(item?.segmentMode ?? 'sentence') // sentence | word | even
  const [overlayBehavior, setOverlayBehavior] = useState(item?.overlayBehavior ?? 'replace') // replace | fade | none
  const [fps, setFps] = useState(item?.fps ?? 30)

  // caption panel
  const [panelEnabled, setPanelEnabled] = useState(item?.panelEnabled ?? true)
  const [panelOpacity, setPanelOpacity] = useState(item?.panelOpacity ?? 0.85)
  const [panelBorder, setPanelBorder] = useState(item?.panelBorder ?? 12)
  const [fontSize, setFontSize] = useState(item?.fontSize ?? 47)

  // timing
  const [targetLen, setTargetLen] = useState(item?.targetSeconds ?? 23)
  const [secPerFrame, setSecPerFrame] = useState(item?.secondsPerFrame ?? 3)

  useEffect(()=>{ setLocal(item) },[item])

  useEffect(() => {
    const path = local?.background
    if (!path) { setPreviewUrl(''); return }
    API.fsPreview(path).then(res=>{
      setPreviewUrl(res?.url || '')
      const ext = (path.split('.').pop()||'').toLowerCase()
      setIsVideo(['mp4','mov','m4v','webm','avi','mkv','gif'].includes(ext))
    })
  }, [local?.background])

  const segments = useMemo(()=> segmentText(local?.text || '', segmentMode, segmentsCount), [local?.text, segmentMode, segmentsCount])

  function update(p){ setLocal(prev => ({ ...prev, ...p })) }

  async function chooseBgFile(){
    const r = await API.fsOpenFile()
    if (r?.path) update({ background:r.path })
  }

  return (
    <aside className={`fixed top-0 right-0 h-full w-[420px] bg-zinc-950 border-l border-white/10 transform transition-transform ${openId? 'translate-x-0':'translate-x-full'}`}>
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <div className="text-sm text-white/80">Inspector</div>
        <div className="flex items-center gap-2">
          <button className="text-xs bg-white/10 px-2 py-1 rounded border border-white/10" onClick={()=>onSave({
            ...local,
            segmentsCount,
            segmentMode,
            overlayBehavior,
            fps,
            panelEnabled,
            panelOpacity: parseNumLoose(panelOpacity, 0.85),
            panelBorder: parseNumLoose(panelBorder, 12),
            fontSize: parseNumLoose(fontSize, 47),
            targetSeconds: parseNumLoose(targetLen, 23),
            secondsPerFrame: parseNumLoose(secPerFrame, 3),
          })}>Apply</button>
          <button className="text-xs bg-white/10 px-2 py-1 rounded border border-white/10" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="p-3 thin-scroll overflow-y-auto h-[calc(100%-48px)]">
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded border border-white/10 bg-black/50">
          {!previewUrl ? (
            <div className="h-full w-full grid place-items-center text-sm text-white/40">Preview (no media)</div>
          ) : isVideo ? (
            <video className="h-full w-full object-cover" src={previewUrl} muted autoPlay loop playsInline />
          ) : (
            <img className="h-full w-full object-cover" src={previewUrl} alt="" />
          )}
          {panelEnabled && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-6 w-[92%] rounded"
                 style={{ background:`rgba(0,0,0,${parseNumLoose(panelOpacity,0.85)})`, padding:`${parseNumLoose(panelBorder,12)}px` }}>
              <div className="text-center leading-snug" style={{ fontSize:`${parseNumLoose(fontSize,47)}px` }}>
                {local?.text}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="text-xs text-white/60">Text / Script</label>
          <textarea className="mt-1 w-full h-28 rounded bg-black/30 border border-white/10 p-2 text-sm"
            value={local?.text || ''} onChange={e=>update({ text:e.target.value })} />
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <div>
            <label className="text-xs text-white/60">Background (server path)</label>
            <input className="mt-1 w-full rounded bg-black/30 border border-white/10 p-2 text-xs"
              value={local?.background || ''} onChange={e=>update({ background:e.target.value })}/>
          </div>
          <button className="self-end h-9 bg-white/10 border border-white/10 rounded px-2 text-xs" onClick={chooseBgFile}>Upload…</button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-white/60">Template</label>
            <select className="mt-1 bg-black/30 border border-white/10 rounded p-2 text-sm" value={local?.template || 'bold-stoic-v2'} onChange={e=>update({ template:e.target.value })}>
              <option>bold-stoic-v2</option>
              <option>clean-minimal</option>
              <option>neon-pop</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/60">Target length (s)</label>
            <input type="number" className="mt-1 bg-black/30 border border-white/10 rounded p-2 text-sm"
              value={targetLen} onChange={e=>setTargetLen(e.target.value)} min={5} max={60}/>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-white/60">Seconds per frame</label>
            <input type="number" className="mt-1 bg-black/30 border border-white/10 rounded p-2 text-sm"
              value={secPerFrame} onChange={e=>setSecPerFrame(e.target.value)} min={1} max={10}/>
          </div>
          <div>
            <label className="text-xs text-white/60">FPS</label>
            <input type="number" className="mt-1 bg-black/30 border border-white/10 rounded p-2 text-sm"
              value={fps} onChange={e=>setFps(e.target.value)} min={24} max={60}/>
          </div>
        </div>

        <div className="mt-3">
          <label className="flex items-center gap-2 text-xs text-white/60">
            <input type="checkbox" checked={panelEnabled} onChange={e=>setPanelEnabled(e.target.checked)} />
            Show caption panel
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <input className="bg-black/30 border border-white/10 rounded p-2 text-xs" value={panelOpacity} onChange={e=>setPanelOpacity(e.target.value)} title="Opacity (0–1)"/>
            <input className="bg-black/30 border border-white/10 rounded p-2 text-xs" value={panelBorder} onChange={e=>setPanelBorder(e.target.value)} title="Padding"/>
            <input className="bg-black/30 border border-white/10 rounded p-2 text-xs" value={fontSize} onChange={e=>setFontSize(e.target.value)} title="Font size"/>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-white/60">Segments count (5–8 recommended)</label>
            <input className="mt-1 bg-black/30 border border-white/10 rounded p-2 text-sm" value={segmentsCount} onChange={e=>setSegmentsCount(parseNumLoose(e.target.value,6))} min={3} max={12} />
          </div>
          <div>
            <label className="text-xs text-white/60">Segment mode</label>
            <select className="mt-1 bg-black/30 border border-white/10 rounded p-2 text-sm" value={segmentMode} onChange={e=>setSegmentMode(e.target.value)}>
              <option value="sentence">sentence</option>
              <option value="word">word</option>
              <option value="even">even (by chars)</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="text-xs text-white/60">Overlay behavior</label>
          <select className="mt-1 bg-black/30 border border-white/10 rounded p-2 text-sm" value={overlayBehavior} onChange={e=>setOverlayBehavior(e.target.value)}>
            <option value="replace">replace (one segment on screen)</option>
            <option value="fade">fade overlap</option>
            <option value="none">no overlay block</option>
          </select>
        </div>

        <Storyboard segments={segments}/>
      </div>
    </aside>
  )
}
