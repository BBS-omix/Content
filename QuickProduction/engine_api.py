# engine_api.py
# ------------------------------------------------------------------
# FastAPI server for your content engine
# - /api/library/backgrounds           (GET)    : list backgrounds
# - /api/library/backgrounds/upload    (POST)   : upload backgrounds (FormData 'files')
# - /api/library/backgrounds/{name}    (DELETE) : delete by filename
# - /api/render/batch                  (POST)   : render images with correct text sizing
# - /api/healthz                       (GET)    : quick check
#
# KEY: Supports two sizing modes
#   1) Relative: size_mode = "vh"
#      Uses font_vh (% of canvas height), margin_vh (% of H), line_gap_em (× font)
#      -> Recommended for shorts/reels (resolution independent)
#   2) Absolute: baseline scaling
#      Uses font_size/line_gap/margin + size_baseline_h (0 = no scaling)
#      -> Back-compat/testing only
#
# Results include style_in, style_resolved, canvas dims.
# Debug overlay shows final fs + mode so you can verify.
# ------------------------------------------------------------------

from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from pathlib import Path
from urllib.parse import urlparse
from datetime import datetime
import re
import shutil

from PIL import Image, ImageDraw, ImageFont

# ---------- App / CORS / Static ------------------------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev-friendly; restrict in prod
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

STATIC_DIR = Path("static")
BG_DIR = STATIC_DIR / "backgrounds"
RENDERS_DIR = STATIC_DIR / "renders"
FONTS_DIR = STATIC_DIR / "fonts"
for p in (STATIC_DIR, BG_DIR, RENDERS_DIR, FONTS_DIR):
    p.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/api/healthz")
async def healthz():
    return {"ok": True, "bg_dir": str(BG_DIR.resolve()), "renders_dir": str(RENDERS_DIR.resolve())}

# ---------- Utils --------------------------------------------------------------
ALLOWED_BG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".mkv", ".webm"}

def safe_filename(name: str) -> str:
    name = name.strip().replace("\\", "/").split("/")[-1]
    base, ext = Path(name).stem, Path(name).suffix.lower()
    base = re.sub(r"[^A-Za-z0-9._-]+", "_", base)[:150] or "file"
    return f"{base}{ext}"

def unique_path(dirpath: Path, filename: str) -> Path:
    p = dirpath / filename
    if not p.exists():
        return p
    base, ext = Path(filename).stem, Path(filename).suffix
    i = 1
    while True:
        q = dirpath / f"{base}-{i}{ext}"
        if not q.exists():
            return q
        i += 1

def _norm_server_path(s: str | None) -> Path | None:
    if not s:
        return None
    try:
        u = urlparse(s)
        if u.scheme and u.netloc:
            s = u.path
    except Exception:
        pass
    s = s.lstrip("/")
    return Path(".") / s

def _pick(d, *keys, default=None):
    for k in keys:
        if isinstance(d, dict) and k in d and d[k] is not None:
            return d[k]
    return default

def _load_font(size: int):
    for cand in (FONTS_DIR / "Inter-Bold.ttf", FONTS_DIR / "Inter.ttf"):
        if cand.exists():
            try:
                return ImageFont.truetype(str(cand), size=size)
            except Exception:
                pass
    return ImageFont.load_default()

def _wrap_text(text: str, draw: ImageDraw.ImageDraw, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    if not text:
        return []
    words = text.split()
    lines, line = [], ""
    for w in words:
        test = (line + " " + w).strip()
        if draw.textlength(test, font=font) <= max_width or not line:
            line = test
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines

# ---------- Style parsing / resolution ----------------------------------------
def _extract_style_in(job: dict) -> dict:
    """Capture incoming values (no scaling) for tracing."""
    style = job.get("style") or {}
    return {
        "size_mode":  (_pick(style, "size_mode", "sizeMode", default="")).lower() or None,
        # relative fields
        "font_vh":    _pick(style, "font_vh", "fontVh"),
        "margin_vh":  _pick(style, "margin_vh", "marginVh"),
        "line_gap_em":_pick(style, "line_gap_em", "lineGapEm"),
        # absolute fields
        "font_size":  _pick(style, "font_size", "fontSize", default=_pick(job, "font_size", "fontSize", default=64)),
        "line_gap":   _pick(style, "line_gap", "lineGap",   default=_pick(job, "line_gap", "lineGap", default=8)),
        "margin":     _pick(style, "text_margin", "margin", "textMargin", default=_pick(job, "text_margin", "margin", default=96)),
        "position":   _pick(style, "text_position", "position", default=_pick(job, "text_position", "position", default="bottom")),
        "baseline_h": _pick(style, "size_baseline_h", "sizeBaselineH", default=_pick(job, "size_baseline_h", default=0)),
    }

def _resolve_style(job: dict, canvas_h: int) -> dict:
    """
    Compute pixel values used to draw from either:
      - Relative mode ("vh"): font_vh(%H), margin_vh(%H), line_gap_em(×font)
      - Absolute mode (baseline scaling): size_baseline_h (0 = no scaling)
    """
    s_in = _extract_style_in(job)
    mode = (s_in.get("size_mode") or "").lower()

    def to_float(v, dv): 
        try: return float(v)
        except Exception: return float(dv)

    def to_int(v, dv):
        try: return int(round(float(v)))
        except Exception: return int(dv)

    if mode == "vh":
        font_vh   = to_float(s_in.get("font_vh"),   4.8)
        margin_vh = to_float(s_in.get("margin_vh"), 9.0)
        gap_em    = to_float(s_in.get("line_gap_em"), 0.42)

        font_px   = max(24, min(220, int(round((font_vh/100.0) * canvas_h))))
        margin_px = max(32, min(int(canvas_h*0.2), int(round((margin_vh/100.0) * canvas_h))))
        gap_px    = max(0,  int(round(gap_em * font_px)))
        scale     = 1.0
        baseline  = None
    else:
        font_px   = to_int(s_in.get("font_size"), 64)
        gap_px    = to_int(s_in.get("line_gap"), 8)
        margin_px = to_int(s_in.get("margin"), 96)
        try:
            baseline = int(s_in.get("baseline_h") or 0)
        except Exception:
            baseline = 0
        scale = (canvas_h / float(baseline)) if baseline else 1.0
        font_px   = max(1, int(round(font_px   * scale)))
        gap_px    = max(0, int(round(gap_px    * scale)))
        margin_px = max(0, int(round(margin_px * scale)))

    return {
        "mode": mode or ("abs" if (s_in.get("baseline_h") not in (None, "", 0)) else "px"),
        "font_size": font_px,
        "line_gap":  gap_px,
        "margin":    margin_px,
        "position":  s_in.get("position") or "bottom",
        "baseline_h": int(s_in.get("baseline_h") or 0),
        "scale": scale,
        # echo inputs for transparency
        "in": s_in,
    }

# ---------- Library endpoints --------------------------------------------------
@app.get("/api/library/backgrounds")
async def list_backgrounds():
    items = []
    for p in sorted(BG_DIR.glob("*")):
        if p.is_file() and p.suffix.lower() in ALLOWED_BG_EXT:
            items.append({"name": p.name, "path": f"/static/backgrounds/{p.name}"})
    return items

@app.post("/api/library/backgrounds/upload")
async def upload_backgrounds(files: List[UploadFile] = File(...)):
    saved, items = [], []
    for uf in files:
        ext = Path(uf.filename).suffix.lower()
        if ext not in ALLOWED_BG_EXT:
            continue
        fname = safe_filename(uf.filename)
        target = unique_path(BG_DIR, fname)
        with target.open("wb") as out:
            shutil.copyfileobj(uf.file, out)
        rel = f"/static/backgrounds/{target.name}"
        saved.append(rel)
        items.append({"name": target.name, "path": rel})
    if not saved:
        raise HTTPException(status_code=400, detail="No valid files uploaded")
    return {"ok": True, "paths": saved, "items": items}

@app.delete("/api/library/backgrounds/{name}")
async def delete_background(name: str):
    name = safe_filename(name)
    p = BG_DIR / name
    if not p.exists():
        raise HTTPException(status_code=404, detail="File not found")
    p.unlink()
    return {"ok": True}

# ---------- Render endpoint ----------------------------------------------------
@app.post("/api/render/batch")
async def render_batch(request: Request):
    body = await request.json()
    jobs = body.get("jobs", [])
    out_dir = body.get("outDir") or body.get("output_dir")
    debug = bool(body.get("debug") or False)

    out_root = Path(out_dir) if out_dir else RENDERS_DIR
    if not out_root.is_absolute():
        out_root = Path(".") / out_root
    if "static" not in out_root.parts:
        out_root = STATIC_DIR / out_root
    out_root.mkdir(parents=True, exist_ok=True)

    outputs, logs = [], []

    for job in jobs:
        try:
            # background
            bg_path = _norm_server_path(job.get("background"))
            if bg_path and bg_path.exists():
                canvas = Image.open(bg_path).convert("RGB")
            else:
                logs.append(f"BG missing/not found: {bg_path}")
                canvas = Image.new("RGB", (1080, 1920), (0, 0, 0))
            W, H = canvas.size

            # style
            st = _resolve_style(job, canvas_h=H)

            # text layout
            text = (job.get("text") or "").strip()
            draw = ImageDraw.Draw(canvas)
            font = _load_font(st["font_size"])

            max_w = max(1, W - 2 * st["margin"])
            lines = _wrap_text(text, draw, font, max_w)

            try:
                ascent, descent = font.getmetrics()
                line_h = ascent + descent
            except Exception:
                line_h = font.size

            total_h = len(lines) * line_h + max(0, (len(lines) - 1)) * st["line_gap"]
            pos = st["position"]
            if pos == "top":
                y0 = st["margin"]
            elif pos == "center":
                y0 = (H - total_h) // 2
            else:
                y0 = H - st["margin"] - total_h

            y = y0
            for ln in lines:
                w = draw.textlength(ln, font=font)
                x = (W - w) // 2
                draw.text((x, y), ln, fill=(240, 240, 240), font=font)
                y += line_h + st["line_gap"]

            # debug overlay
            if debug:
                info = (
                    f"fs={st['font_size']} mode={st['mode']} "
                    f"(in={st['in'].get('font_size') or st['in'].get('font_vh')} "
                    f"@{st.get('baseline_h',0)}, x{st['scale']:.2f})"
                )
                small = _load_font(max(18, st["font_size"] // 6))
                pad = 8
                tw = draw.textlength(info, font=small)
                th = int(1.6 * small.size)
                draw.rectangle([6, 6, 6 + tw + 2*pad, 6 + th], fill=(0, 0, 0))
                draw.text((6 + pad, 6 + (th - small.size) // 2), info, fill=(255, 255, 0), font=small)

            # output file
            ts = datetime.now().strftime("%Y%m%d%H%M%S")
            filename = f"{job.get('id','item')}-{ts}.png"
            out_path = out_root / filename
            out_path.parent.mkdir(parents=True, exist_ok=True)
            canvas.save(out_path)

            rel = out_path.resolve().relative_to(Path(".").resolve())
            outputs.append({
                "id": job.get("id"),
                "filename": filename,
                "path": f"/{rel.as_posix()}",
                "style_in": st["in"],
                "style_resolved": {
                    "mode": st["mode"],
                    "font_size": st["font_size"],
                    "line_gap":  st["line_gap"],
                    "margin":    st["margin"],
                    "position":  st["position"],
                    "baseline_h": st["baseline_h"],
                    "scale": st["scale"],
                },
                "canvas": {"w": W, "h": H},
            })
            logs.append(f"resolved_style={st} -> {filename}")

        except Exception as e:
            logs.append(f"job {job.get('id')} failed: {e}")

    return JSONResponse({"ok": True, "outputs": outputs, "logs": logs})
