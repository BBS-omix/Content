import { create } from "zustand";

export type Item = {
  id: string;
  order?: number;
  text: string;

  backgroundPath?: string | null;
  backgroundUrl?: string | null;
  localBg?: File | null;

  fontSize?: number;
  lineGap?: number;
  margin?: number;
  position?: "top" | "center" | "bottom";

  template?: string;
  target?: string;
};

type LibBackground = string | { path: string };

type AppState = {
  items: Item[];
  lib: { backgrounds: LibBackground[] };
  selected: Set<string>;

  setItems: (items: Item[]) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  toggleSelect: (id: string, checked?: boolean) => void;
  selectMany: (ids: Set<string>) => void;

  addBackgroundPaths: (paths: string[]) => void;
  attachBackgroundToSelection: (opts: { path?: string; file?: File; clear?: boolean }) => void;
};

const fname = (p?: string | null) => (p ?? "").split("/").pop() || p || "";

export const useApp = create<AppState>((set, get) => ({
  items: [],
  lib: { backgrounds: [] },
  selected: new Set(),

  setItems: (items) => set({ items, selected: new Set() }),

  updateItem: (id, patch) =>
    set((s) => ({
      items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    })),

  toggleSelect: (id, checked) =>
    set((s) => {
      const next = new Set(s.selected);
      const isOn = next.has(id);
      const shouldOn = checked ?? !isOn;
      if (shouldOn) next.add(id);
      else next.delete(id);
      return { selected: next };
    }),

  selectMany: (ids) => set(() => ({ selected: new Set(ids) })),

  addBackgroundPaths: (paths) =>
    set((s) => {
      const have = new Set(
        s.lib.backgrounds.map((b) =>
          typeof b === "string" ? fname(b) : fname(b.path)
        )
      );
      const add: string[] = [];
      for (const p of paths) {
        const n = fname(p);
        if (n && !have.has(n)) add.push(p);
      }
      return add.length
        ? { lib: { backgrounds: [...s.lib.backgrounds, ...add] } }
        : {};
    }),

  attachBackgroundToSelection: ({ path, file, clear }) =>
    set((s) => {
      if (!s.selected.size) return {};
      const items = s.items.map((it) => {
        if (!s.selected.has(it.id)) return it;
        if (clear) return { ...it, backgroundPath: null, backgroundUrl: null, localBg: null };
        if (path) return { ...it, backgroundPath: path, backgroundUrl: path, localBg: null };
        if (file) return { ...it, localBg: file, backgroundPath: null, backgroundUrl: null };
        return it;
      });
      return { items };
    }),
}));
