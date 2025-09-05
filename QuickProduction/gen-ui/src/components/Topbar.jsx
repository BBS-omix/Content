export default function Topbar({
  channel,
  setChannel,
  preset,
  setPreset,
  onImport,
  onChooseFolder,         // library upload / choose folder for BGs
  onRender,
  selectedCount,
  msg,
  // NEW handlers (safe no-ops if not provided)
  onPrepareTemplate = () => {},
  onPrepareEntrance = () => {},
  onChooseOutputFolder = () => {},
}) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-black/30 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <span className="text-sm text-white/80 font-medium">Generator</span>

        <select
          className="bg-black/30 border border-white/10 rounded px-2 py-1 text-sm"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
        >
          <option>Men's Motivation (TR)</option>
          <option>Stoicism (EN)</option>
          <option>General Quotes (EN)</option>
        </select>

        <select
          className="bg-black/30 border border-white/10 rounded px-2 py-1 text-sm"
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
        >
          <option>Dark Gold</option>
          <option>Neon Pop</option>
          <option>Minimal White</option>
        </select>

        <div className="flex-1" />

        {/* Existing actions (labels aligned with your landing page) */}
        <button
          onClick={onImport}
          className="text-sm bg-white/10 border border-white/10 rounded px-3 py-1.5 hover:bg-white/15"
        >
          Import .txt
        </button>
        <button
          onClick={onChooseFolder}
          className="text-sm bg-white/10 border border-white/10 rounded px-3 py-1.5 hover:bg-white/15"
        >
          Upload Backgrounds
        </button>

        {/* NEW actions */}
        <button
          onClick={onPrepareTemplate}
          className="text-sm bg-white/10 border border-white/10 rounded px-3 py-1.5 hover:bg-white/15"
        >
          Prepare Template
        </button>
        <button
          onClick={onPrepareEntrance}
          className="text-sm bg-white/10 border border-white/10 rounded px-3 py-1.5 hover:bg-white/15"
        >
          Prepare Entrance
        </button>
        <button
          onClick={onChooseOutputFolder}
          className="text-sm bg-white/10 border border-white/10 rounded px-3 py-1.5 hover:bg-white/15"
        >
          Choose default output folder
        </button>

        <button
          onClick={onRender}
          className="text-sm bg-indigo-500 hover:bg-indigo-600 rounded px-3 py-1.5 disabled:opacity-50"
          disabled={!selectedCount}
        >
          Render Selected ({selectedCount || 0})
        </button>

        <div className="text-xs text-white/60 ml-3 truncate">{msg}</div>
      </div>
    </header>
  );
}
