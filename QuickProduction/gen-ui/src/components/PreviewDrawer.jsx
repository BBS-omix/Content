import Drawer from "../shared/Drawer";
import PreviewPane from "./PreviewPane";

export default function PreviewDrawer({ open, onClose, item }) {
  if (!open || !item) return null;
  const bg = item.backgroundPath || item.backgroundUrl || null;
  return (
    <Drawer open={open} onClose={onClose} title={`Preview — Item #${item.order ?? "-"}`} width={560}>
      <div className="p-3 space-y-2">
        <PreviewPane
          background={bg}
          text={item.text || ""}
          fontSize={item.fontSize ?? 64}
          lineGap={item.lineGap ?? 8}
          margin={item.margin ?? 96}
          position={item.position ?? "bottom"}
          dim={0.25}
        />
        <div className="text-xs text-zinc-400">
          Template: {item.template || "bold-stoic-v2"} • Target: {item.target || "18–28s"}
        </div>
      </div>
    </Drawer>
  );
}
