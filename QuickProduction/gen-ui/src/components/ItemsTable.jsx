// src/components/ItemsTable.jsx
import { useMemo, useRef, useState } from "react";
import { useApp } from "../store";
import { renderBatch, API_BASE } from "../api";

const toPath = (b) => (typeof b === "string" ? b : b?.path || "");
const fname = (p) => (p || "").split("/").pop() || p;

export default function ItemsTable({ onEdit }) {
  const [q, setQ] = useState("");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef(null);

  const { items, selected, toggleSelect, selectMany, updateItem, lib } = useApp();

  const libNames = useMemo(
    () =>
      new Set(
        (lib?.backgrounds || [])
          .map((b) => fname(toPath(b)).toLowerCase())
          .filter(Boolean)
      ),
    [lib]
  );

  const filtered = useMemo(() => {
    if (!q) return items;
    const n = q.toLowerCase();
    return items.filter((it) => (it.text || "").toLowerCase().includes(n));
  }, [items, q]);

  const isSelected = (id) => !!selected?.has?.(id);
  const selectedCount = selected?.size || 0;

  const statusFor = (it) => {
    const p = it.backgroundPath || it.backgroundUrl;
    if (!p) return "Relink needed";
    return libNames.has(fname(p).toLowerCase()) ? "Ready" : "Relink needed";
  };

  const onSelectAll = (e) => {
    const ids = filtered.map((i) => i.id);
    selectMany(e.target.checked ? new Set(ids) : new Set());
  };

  const startRender = async () => {
    const targets = items.filter((it) => isSelected(it.id));
    if (!targets.length) return;

    setRunning(true);
    setResults([]);
    setShowResults(true);

    const jobs = targets.map((it) => ({
      id: it.id,
      text: it.text,
      background: it.backgroundPath || it.backgroundUrl || null,
      fontSize: it.fontSize ?? 64,
      lineGap: it.lineGap ?? 8,
      margin: it.margin ?? 96,
      position: it.position || "bottom",
      template: it.template || "bold-stoic-v2",
      target: it.target || "18-28s",
    }));

    try {
      const res = await renderBatch(jobs, { debug: true });
      setLogs((l) => [...l, ...(res.logs || [])]);

      const outs = (res.outputs || []).map((o) => ({
        id: o.id,
        url: o.path?.startsWith("http") ? o.path : `${API_BASE}${o.path}`,
        trace: {
          canvasH: o.canvas?.h,
          fs: o.style_resolved?.font_size,
          gap: o.style_resolved?.line_gap,
          margin: o.style_resolved?.margin,
          mode: o.style_resolved?.mode,
          scale: o.style_resolved?.scale,
          baseline: o.style_resolved?.baseline_h,
          inFont: o.style_in?.font_size ?? o.style_in?.font_vh,
        },
      }));
      setResults(outs);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    } catch (err) {
      setLogs((l) => [...l, `fetch error: ${String(err)}`]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden w-full">
      {/* toolbar */}
      <div className="p-2 sm:p-3 flex flex-wrap items-center gap-2 bg-zinc-950/80 border-b border-white/5 sticky top-[48px] z-20">
        <input className="input flex-1 min-w-[220px] max-w-sm" placeholder="Search quotes…" value={q} onChange={(e)=>setQ(e.target.value)} />
        <button className="btn" onClick={() => setQ("")}>Clear</button>
        <div className="text-xs text-zinc-400">{selectedCount} selected</div>
        <button className="btn-primary" disabled={!selectedCount || running} onClick={startRender}>
          {running ? "Rendering…" : "Render Selected"}
        </button>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm table-fixed">
          <thead className="bg-zinc-900/60">
            <tr className="border-b border-white/5">
              <th className="p-2">
                <input
                  type="checkbox"
                  onChange={onSelectAll}
                  checked={!!selectedCount && filtered.length > 0 && filtered.every((i) => isSelected(i.id))}
                />
              </th>
              <th className="p-2">#</th>
              <th className="p-2">Text / Script</th>
              <th className="p-2">BG</th>
              <th className="p-2">Template</th>
              <th className="p-2">Target</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => {
              const ok = statusFor(it) === "Ready";
              return (
                <tr key={it.id} className="border-b border-white/5 hover:bg-zinc-900/40">
                  <td className="p-2 align-top">
                    <input
                      type="checkbox"
                      checked={isSelected(it.id)}
                      onChange={() => toggleSelect(it.id, !isSelected(it.id))}
                    />
                  </td>
                  <td className="p-2 align-top text-zinc-400">{it.order ?? "-"}</td>
                  <td className="p-2 align-top">
                    <div className="truncate max-w-[46vw]" title={it.text}>{it.text}</div>
                    <div className="mt-1 text-xs">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${ok ? "border-emerald-500 text-emerald-400" : "border-amber-500 text-amber-400"}`}>
                        {ok ? "Ready" : "Relink needed"}
                      </span>
                    </div>
                  </td>
                  <td className="p-2 align-top">
                    {it.backgroundPath
                      ? <code className="text-xs text-zinc-400 break-all">{it.backgroundPath}</code>
                      : <span className="text-xs text-zinc-500">none</span>}
                  </td>
                  <td className="p-2 align-top">{it.template || "bold-stoic-v2"}</td>
                  <td className="p-2 align-top">{it.target || "18-28s"}</td>
                  <td className="p-2 align-top">
                    <button className="btn" onClick={() => onEdit?.(it.id)}>Edit</button>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-zinc-500">No results.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* results */}
      {showResults && (
        <div ref={resultsRef} className="p-3 border-t border-white/10 bg-zinc-900/70">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Results</div>
            <button className="btn" onClick={() => setShowResults(false)}>Hide</button>
          </div>

          {results.length > 0 ? (
            <div className="space-y-2 text-xs">
              {results.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2">
                  <a className="btn" href={r.url} target="_blank" rel="noreferrer">Open</a>
                  <code className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                    fs={r.trace.fs}px, gap={r.trace.gap}, margin={r.trace.margin}, H={r.trace.canvasH}, mode={r.trace.mode}, ×{(r.trace.scale || 1).toFixed(2)}
                  </code>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-amber-300">
              No files produced — check the logs below.
            </div>
          )}
        </div>
      )}

      {/* logs */}
      {!!logs.length && (
        <div className="p-2 text-xs text-zinc-300 bg-zinc-900/80 border-t border-white/10 max-h-56 overflow-auto space-y-1">
          {logs.map((l, i) => (<div key={i}>{l}</div>))}
        </div>
      )}
    </div>
  );
}
