import { useEffect, useRef } from "react";
import { drawCharacter, type CharId } from "@/lib/game";

export function CharacterPreview({ char, size = 72 }: { char: CharId; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    c.width = size * dpr;
    c.height = size * dpr;
    let raf = 0;
    const loop = (ts: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      drawCharacter(ctx, char, size / 2, size * 0.92, size * 0.62, 1, ts / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [char, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden />;
}
