import { useEffect, useState } from "react";
import { useApp } from "../store";
import { uploadBackgrounds, listBackgrounds, API_BASE } from "../api";

// helpers
const filename = (p) => (p || "").split("/").pop() || p;
const toAbsolute = (p) => {
  if (!p) return p;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  if (p.startsWith("/")) return `${API_BASE}${p}`;
  return `${API_BASE}/static/backgrounds/${filename(p)}`;
};

export default function Toolbar({
  // optional hooks to wire later if you want side effects
  onPrepareTemplate = () => {},
  onPrepareEntrance = () => {},
  onChooseOutputFolder = () => {},
}) {
  const { setItems, lib, addBackgroundPaths } = useApp();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Sync library once on mount (safe if empty)
  useEffect(() => {
    (async () => {
      try {
        const arr = await listBackgrounds(); // [{name, path}]
        if (Array.isArray(arr) && arr.length) {
          addBackgroundPaths(arr.map((b) => b.path));
        }
      } catch (_) {
        // ignore — we'll show messages on explicit upload
      }
    })();
  }, [addBackgroundPaths]);

  // ---- Import .txt -> setItems ------------------------------------------------
  const onImportTxt = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow reselecting same file
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const items = lines.map((t, i) => ({
        id: (crypto?.randomUUID && crypto.randomUUID()) || `${Date.now()}-${i}`,
        text: t,
        order: i + 1,
      }));
      setItems(items);
      setMsg(`Imported ${lines.length} lines`);
    } catch (err) {
      setMsg(`Import failed: ${String(err)}`);
    }
  };

  // ---- Upload Backgrounds -> library -----------------------------------------
  const onUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    setBusy(true);
    setMsg("Uploading…");
    try {
      const res = await uploadBackgrounds(files);
      // backend returns { ok, paths: ["/static/backgrounds/.."], items?: [{path}] }
      const raw = Array.isArray(res?.paths)
        ? res.paths
        : Array.isArray(res?.items)
        ? res.items.map((x) => x.path)
        : [];

      // ensure absolute paths for previews, but store accepts either
      const abs = raw.map((p) => toAbsolute(p));
      addBackgroundPaths(abs);

      // refresh list (dedupe handled in store)
      try {
        const fresh = await listBackgrounds();
        if (Array.isArray(fresh)) addBackgroundPaths(fresh.map((x) => x.path));
      } catch {}

      setMsg(`Uploaded ${files.length} file(s).`);
    } catch (err) {
      setMsg(`Upload crashed: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-black/30 border-b border-white/5">
      <div className="max-w-[2160px] mx-auto px-4 py-3 flex items-center gap-2">
        <span className="text-sm text-white/80 font-medium">Storyboard</span>
        <div className="flex-1" />

        {/* Import .txt */}
        <label className="btn cursor-pointer">
          <input type="file" accept=".txt" className="hidden" onChange={onImportTxt} />
          Import .txt
        </label>

        {/* Upload Backgrounds */}
        <label className="btn cursor-pointer">
          <input
            type="file"
            multiple
            accept="video/*,image/*"
            className="hidden"
            onChange={onUpload}
          />
          Upload Backgrounds
        </label>

        {/* New actions (UI now, wire later) */}
        <button className="btn" onClick={onPrepareTemplate}>
          Prepare Template
        </button>
        <button className="btn" onClick={onPrepareEntrance}>
          Prepare Entrance
        </button>
        <button className="btn" onClick={onChooseOutputFolder}>
          Choose default output folder
        </button>

        {/* Status chips */}
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-white/10 bg-zinc-900/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {(lib?.backgrounds?.length || 0)} in library
        </span>
        <span className="text-xs text-zinc-400">{busy ? "⏳ " : ""}{msg}</span>
      </div>
    </header>
  );
}
