import { useMemo, useRef, useState, useEffect } from "react";
import { useApp } from "../store";
import Drawer from "../shared/Drawer";
import PreviewPane from "./PreviewPane";

const ALLOWED = /\.(mp4|mov|mkv|webm|jpg|jpeg|png|webp)$/i;
const toPath = (b) => (typeof b === "string" ? b : b?.path || "");
const fname = (p) => (p || "").split("/").pop() || p;

function useItemById(id) {
  const { items } = useApp();
  return useMemo(() => items.find((i) => i.id === id) || null, [items, id]);
}

export default function Inspector({ open, onClose, itemId }) {
  const pickRef = useRef(null);
  const item = useItemById(itemId);
  const { updateItem, attachBackgroundToSelection, lib, selected } = useApp();

  const [tab, setTab] = useState("library");
  const [chosen, setChosen] = useState(null);
  const [dim, setDim] = useState(0.25);

  const libClean = useMemo(() => {
    const uniq = new Map();
    (lib?.backgrounds || []).forEach((b) => {
      const p = toPath(b);
      if (!p || !ALLOWED.test(p)) return;
      const key = fname(p).toLowerCase();
      if (!uniq.has(key)) uniq.set(key, { name: fname(p), path: p });
    });
    return Array.from(uniq.values());
  }, [lib]);

  const currentBg = item?.backgroundPath || item?.backgroundUrl || null;

  useEffect(() => { if (!open) setChosen(null); }, [open, itemId]);
  if (!open || !item) return null;

  const setNum = (k) => (v) => updateItem(item.id, { [k]: Number(v) });
  const setStr = (k) => (v) => updateItem(item.id, { [k]: v });

  const onLocalPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    attachBackgroundToSelection({ file: f });
    setTab("local");
  };

  const applyToCurrent = () => {
    if (!chosen) return;
    updateItem(item.id, { backgroundPath: chosen, backgroundUrl: chosen, localBg: null });
  };
  const applyToSelection = () => {
    if (!chosen) return;
    attachBackgroundToSelection({ path: chosen });
  };
  const clearBgSelection = () => attachBackgroundToSelection({ clear: true });

  const previewSrc = chosen || currentBg || null;

  return (
    <Drawer open={open} onClose={onClose} title={`Inspector — Item #${item.order ?? "-"}`} width={520}>
      <div className="p-3 space-y-3">
        <label className="block text-xs mb-1 text-zinc-400">Text / Script</label>
        <textarea
          className="input min-h-28"
          value={item.text || ""}
          onChange={(e)=>updateItem(item.id, { text: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Font size (px)" value={item.fontSize ?? 64} onChange={setNum("fontSize")} />
          <SelectField label="Position" value={item.position ?? "bottom"} options={["top","center","bottom"]} onChange={setStr("position")} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Line spacing (px)" value={item.lineGap ?? 8} onChange={setNum("lineGap")} />
          <NumberField label="Margin (px)" value={item.margin ?? 96} onChange={setNum("margin")} />
        </div>

        <div className="grid gap-2">
          <PreviewPane
            background={previewSrc}
            text={item.text || ""}
            fontSize={item.fontSize ?? 64}
            lineGap={item.lineGap ?? 8}
            margin={item.margin ?? 96}
            position={item.position ?? "bottom"}
            dim={dim}
          />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400">Dim BG</span>
            <input type="range" min="0" max="0.6" step="0.05" value={dim} onChange={(e)=>setDim(parseFloat(e.target.value))} />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400">Current BG:</span>
          {currentBg ? (
            <span className="px-2 py-0.5 rounded-full border border-white/10 bg-zinc-900 text-zinc-300 truncate max-w-[280px]" title={currentBg}>
              {fname(currentBg)}
            </span>
          ) : <span className="text-zinc-500">none</span>}
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn" disabled={!chosen} onClick={applyToCurrent}>Apply to current</button>
          <button className="btn" disabled={!chosen || selected.size===0} onClick={applyToSelection}>Apply BG to selection ({selected.size})</button>
          <button className="btn" onClick={clearBgSelection}>Clear BG</button>
        </div>

        <div className="flex gap-2 text-xs mt-1">
          <label className="btn">
            <input ref={pickRef} type="file" accept="video/*,image/*" className="hidden" onChange={onLocalPick} />
            Local file preview
          </label>
          <button className="btn" onClick={()=>setTab("library")}>Pick from Library…</button>
        </div>

        {tab==="library" && (
          <>
            <div className="text-xs text-zinc-400">Showing {libClean.length} backgrounds</div>
            <div className="grid grid-cols-3 gap-2 max-h-[520px] overflow-auto pr-1">
              {libClean.map((b) => {
                const isChosen = chosen === b.path;
                const isCurrent = currentBg && fname(currentBg) === fname(b.path);
                return (
                  <button
                    key={b.path}
                    className={`aspect-[9/16] w-full rounded-lg overflow-hidden border relative ${isChosen ? "border-violet-500" : isCurrent ? "border-emerald-500" : "border-white/10"} hover:border-violet-500`}
                    onClick={() => setChosen(b.path)}
                    title={b.name}
                  >
                    {/\.(mp4|mov|mkv|webm)$/i.test(b.path)
                      ? <div className="w-full h-full grid place-items-center text-[11px] text-zinc-400 px-1 text-center">🎞 {b.name}</div>
                      : <img src={b.path} alt={b.name} className="w-full h-full object-cover" />
                    }
                    {isCurrent && <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/80">current</span>}
                    {isChosen && !isCurrent && <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-violet-600/80">chosen</span>}
                  </button>
                );
              })}
              {!libClean.length && <div className="col-span-3 text-center text-sm text-zinc-500 py-8">Empty. Upload backgrounds from the toolbar.</div>}
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}

function NumberField({ label, value, onChange, step=1, min=1, max=256 }) {
  return (
    <label className="text-xs text-zinc-400 grid gap-1">{label}
      <input type="number" className="input" value={value} min={min} max={max} step={step} onChange={(e)=>onChange(Number(e.target.value))} />
    </label>
  );
}
function SelectField({ label, value, onChange, options }) {
  return (
    <label className="text-xs text-zinc-400 grid gap-1">{label}
      <select className="input" value={value} onChange={(e)=>onChange(e.target.value)}>
        {options.map((o)=>(<option key={o} value={o}>{o}</option>))}
      </select>
    </label>
  );
}
