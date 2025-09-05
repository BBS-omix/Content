import { useMemo } from "react";

export default function PreviewPane({
  background,
  text,
  fontSize = 64,
  lineGap = 8,
  margin = 96,
  position = "bottom",
  dim = 0.25,
}) {
  const isVideo = typeof background === "string" && /\.(mp4|mov|mkv|webm)$/i.test(background);
  const alignY = position === "top" ? "justify-start" : position === "center" ? "justify-center" : "justify-end";

  const style = useMemo(
    () => ({
      fontSize: `${fontSize}px`,
      lineHeight: `${(fontSize + lineGap) / fontSize}`,
      padding: `${margin}px`,
    }),
    [fontSize, lineGap, margin]
  );

  return (
    <div className="aspect-[9/16] w-full rounded-lg overflow-hidden border border-white/10 relative bg-black">
      {isVideo ? (
        <video src={background} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline />
      ) : background ? (
        <img src={background} className="absolute inset-0 w-full h-full object-cover" alt="" />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-zinc-600 text-sm">No background</div>
      )}
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${dim})` }} />
      <div className={`absolute inset-0 flex ${alignY} items-center`}>
        <div className="w-full text-white text-center [text-shadow:_0_2px_10px_rgba(0,0,0,.6)]" style={style}>
          {text}
        </div>
      </div>
    </div>
  );
}
