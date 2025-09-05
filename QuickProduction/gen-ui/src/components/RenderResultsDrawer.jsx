import Drawer from "../shared/Drawer";

export default function RenderResultsDrawer({ open, onClose, outputs = [] }) {
  if (!open) return null;

  return (
    <Drawer open={open} onClose={onClose} title="Render results" width={560}>
      <div className="p-3 space-y-3">
        {!outputs.length && (
          <div className="text-sm text-zinc-400">No outputs returned.</div>
        )}
        <ul className="space-y-2">
          {outputs.map((o) => (
            <li key={o.id} className="text-sm">
              <div className="text-zinc-400 text-xs mb-0.5">Job: {o.id}</div>
              <a
                href={o.url}
                target="_blank"
                rel="noreferrer"
                className="text-violet-300 hover:underline break-all"
              >
                {o.url}
              </a>
            </li>
          ))}
        </ul>
        <div className="text-xs text-zinc-500">
          Links open directly from the API’s static folder. Replace this dialog later with a gallery if you’d like.
        </div>
      </div>
    </Drawer>
  );
}
