// App.jsx — responsive full-width layout
import { useState } from "react";
import Toolbar from "./components/Toolbar";
import ItemsTable from "./components/ItemsTable";
import Inspector from "./components/Inspector";
import "./index.css";

export default function App() {
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const openInspector = (id) => { setActiveId(id); setInspectorOpen(true); };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Toolbar />
      <main className="flex-1 w-full px-4 sm:px-6 xl:px-10 2xl:px-16 py-4 max-w-[2160px] mx-auto">
        <ItemsTable onEdit={openInspector} />
      </main>
      <Inspector open={inspectorOpen} onClose={() => setInspectorOpen(false)} itemId={activeId} />
    </div>
  );
}
