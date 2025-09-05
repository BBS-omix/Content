import { useEffect } from "react";

export default function Drawer({ open, onClose, width = 420, title, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/60 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full bg-zinc-950 border-l border-white/10 shadow-2xl" style={{ width }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="text-sm font-medium text-zinc-200">{title}</div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div className="h-[calc(100%-48px)] overflow-auto">{children}</div>
      </aside>
    </div>
  );
}
