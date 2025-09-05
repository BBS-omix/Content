// src/api.js
export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export function toServerPath(p) {
  if (!p) return null;
  if (p.startsWith("/")) return p;
  if (p.startsWith(API_BASE)) return p.replace(API_BASE, "");
  if (!p.startsWith("http")) {
    const name = p.split("/").pop();
    return `/static/backgrounds/${name}`;
  }
  return p;
}

// ---- Library
export async function listBackgrounds() {
  const res = await fetch(`${API_BASE}/api/library/backgrounds`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  return res.json();
}
export async function uploadBackgrounds(files) {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  const res = await fetch(`${API_BASE}/api/library/backgrounds/upload`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) return { ok: false, paths: [], errors: [await res.text()] };
  return res.json();
}
export async function deleteBackground(name) {
  const res = await fetch(
    `${API_BASE}/api/library/backgrounds/${encodeURIComponent(name)}`,
    { method: "DELETE" }
  );
  if (!res.ok) return { ok: false, error: await res.text() };
  return res.json();
}

/**
 * Map UI item -> render job (RELATIVE SIZING by default).
 * We convert your current px inputs to relative:
 *   font_vh   = fontSize / 1080 * 100
 *   margin_vh = margin   / 1080 * 100
 *   line_gap_em = lineGap / fontSize
 */
function mapJob(it) {
  const num = (v, d) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };

  const fontPx   = num(it.fontSize ?? it.font_size, 64);
  const lineGap  = num(it.lineGap  ?? it.line_gap,  8);
  const marginPx = num(it.margin, 96);
  const position = it.position || "bottom";

  // convert px (assuming 1080p reference) to relative for cross-res consistency
  const fontVh   = (fontPx / 1080) * 100;           // %
  const marginVh = (marginPx / 1080) * 100;         // %
  const gapEm    = fontPx > 0 ? (lineGap / fontPx) : 0.42;

  const style = {
    size_mode: "vh",
    font_vh: fontVh,
    margin_vh: marginVh,
    line_gap_em: gapEm,
    text_position: position,

    // Mirrors (if any mixed codepath reads camelCase)
    sizeMode: "vh",
    fontVh: fontVh,
    marginVh: marginVh,
    lineGapEm: gapEm,
    position,
  };

  return {
    id: it.id,
    text: it.text ?? "",
    background: toServerPath(
      it.background ?? it.backgroundPath ?? it.backgroundUrl ?? null
    ),
    template: it.template || "bold-stoic-v2",
    target: it.target || "18-28s",

    // legacy mirrors still present (harmless)
    fontSize: fontPx,
    lineGap,
    margin: marginPx,
    position,

    // canonical bundle
    style,
  };
}

export async function renderBatch(jobs, options = {}) {
  const body = {
    jobs: (jobs || []).map(mapJob),
    ...(options.outDir ? { outDir: options.outDir } : {}),
    debug: options.debug ?? true, // keep true for easy verification
  };
  const res = await fetch(`${API_BASE}/api/render/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, logs: [await res.text()] };
  return res.json();
}
