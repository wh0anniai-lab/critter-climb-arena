export type CharId = "cat" | "dog" | "hamster" | "alien";
export type MapId = "cute" | "spooky";

export const CHARACTERS: { id: CharId; name: string }[] = [
  { id: "cat", name: "고양이" },
  { id: "dog", name: "강아지" },
  { id: "hamster", name: "햄스터" },
  { id: "alien", name: "외계인" },
];

export const MAPS: { id: MapId; name: string; desc: string }[] = [
  { id: "cute", name: "솜사탕 하늘", desc: "알록달록 귀여운 사탕 구름 점프맵" },
  { id: "spooky", name: "으스스 유령 언덕", desc: "살짝 무서운 밤의 유령 점프맵" },
];

export const MAX_PUSHES = 10;
export const WORLD_W = 800;
export const PLAYER_SIZE = 40;
export const GRAVITY = 0.6;
export const JUMP_V = -13.2;
export const MOVE_SPEED = 4.6;

export interface Platform {
  x: number;
  y: number; // top
  w: number;
  goal?: boolean;
  deco?: number;
}

export interface MapData {
  id: MapId;
  height: number;
  platforms: Platform[];
}

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LEVELS = 42;
const GAP = 108;

export function buildMap(id: MapId): MapData {
  const r = rng(id === "cute" ? 1234 : 6666);
  const height = LEVELS * GAP + 400;
  const platforms: Platform[] = [];
  // ground
  platforms.push({ x: 0, y: height - 40, w: WORLD_W });
  let px = WORLD_W / 2;
  for (let i = 1; i <= LEVELS; i++) {
    const w = i === LEVELS ? 220 : 85 + r() * 70 - Math.min(i, 30);
    let nx = px + (r() * 2 - 1) * 230;
    if (Math.abs(nx - px) < 70) nx = px + (nx >= px ? 90 : -90);
    nx = Math.max(w / 2 + 10, Math.min(WORLD_W - w / 2 - 10, nx));
    if (i === LEVELS) nx = WORLD_W / 2;
    platforms.push({
      x: nx - w / 2,
      y: height - 40 - i * GAP,
      w,
      goal: i === LEVELS,
      deco: Math.floor(r() * 6),
    });
    px = nx;
  }
  return { id, height, platforms };
}

/* ---------------- drawing ---------------- */

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function eyes(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, f: number, big = false) {
  const off = f * s * 0.06;
  const er = big ? s * 0.13 : s * 0.075;
  for (const dx of [-0.17, 0.17]) {
    circle(ctx, cx + dx * s + off, cy, er, "#2b2140");
    circle(ctx, cx + dx * s + off + er * 0.35, cy - er * 0.4, er * 0.4, "#ffffff");
  }
}

function blush(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color = "rgba(255,120,150,0.55)") {
  circle(ctx, cx - s * 0.3, cy + s * 0.1, s * 0.08, color);
  circle(ctx, cx + s * 0.3, cy + s * 0.1, s * 0.08, color);
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  char: CharId,
  x: number,
  bottom: number,
  s: number,
  facing: number,
  t: number,
  moving = false,
) {
  const bob = moving ? Math.sin(t * 18) * s * 0.04 : Math.sin(t * 3) * s * 0.015;
  const cx = x;
  const cy = bottom - s / 2 + bob;
  const r = s * 0.48;
  // shadow
  ctx.beginPath();
  ctx.ellipse(cx, bottom, s * 0.35, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fill();

  if (char === "cat") {
    ctx.fillStyle = "#ffb36b";
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + d * r * 0.85, cy - r * 0.2);
      ctx.lineTo(cx + d * r * 0.6, cy - r * 1.15);
      ctx.lineTo(cx + d * r * 0.1, cy - r * 0.75);
      ctx.fill();
    }
    circle(ctx, cx, cy, r, "#ffb36b");
    ctx.fillStyle = "#f08a3c";
    ctx.fillRect(cx - r * 0.08, cy - r * 0.98, r * 0.16, r * 0.3);
    eyes(ctx, cx, cy - s * 0.02, s, facing);
    blush(ctx, cx, cy, s);
    circle(ctx, cx + facing * s * 0.06, cy + s * 0.08, s * 0.035, "#ff6b8a");
    ctx.strokeStyle = "#7a4a2a";
    ctx.lineWidth = Math.max(1, s * 0.02);
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + d * s * 0.22, cy + s * 0.12);
      ctx.lineTo(cx + d * s * 0.45, cy + s * 0.08);
      ctx.moveTo(cx + d * s * 0.22, cy + s * 0.16);
      ctx.lineTo(cx + d * s * 0.45, cy + s * 0.19);
      ctx.stroke();
    }
  } else if (char === "dog") {
    circle(ctx, cx, cy, r, "#f3d2a2");
    circle(ctx, cx + r * 0.4, cy - r * 0.35, r * 0.28, "#e0b27a");
    ctx.fillStyle = "#9c6b48";
    for (const d of [-1, 1]) {
      ctx.save();
      ctx.translate(cx + d * r * 0.85, cy - r * 0.2);
      ctx.rotate(d * 0.3 + Math.sin(t * 6) * 0.08);
      ctx.beginPath();
      ctx.ellipse(0, r * 0.3, r * 0.25, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    eyes(ctx, cx, cy - s * 0.04, s, facing);
    blush(ctx, cx, cy, s);
    circle(ctx, cx + facing * s * 0.06, cy + s * 0.07, s * 0.06, "#3a2a2a");
    ctx.beginPath();
    ctx.ellipse(cx + facing * s * 0.06, cy + s * 0.2, s * 0.06, s * 0.08, 0, 0, Math.PI);
    ctx.fillStyle = "#ff7a99";
    ctx.fill();
  } else if (char === "hamster") {
    circle(ctx, cx - r * 0.65, cy - r * 0.75, r * 0.28, "#e8a96a");
    circle(ctx, cx + r * 0.65, cy - r * 0.75, r * 0.28, "#e8a96a");
    circle(ctx, cx - r * 0.65, cy - r * 0.75, r * 0.15, "#ffc4c4");
    circle(ctx, cx + r * 0.65, cy - r * 0.75, r * 0.15, "#ffc4c4");
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.05, r * 1.08, r, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#f6c489";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.35, r * 0.75, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#fff6ea";
    ctx.fill();
    eyes(ctx, cx, cy - s * 0.06, s, facing);
    circle(ctx, cx - s * 0.33, cy + s * 0.1, s * 0.12, "rgba(255,140,160,0.6)");
    circle(ctx, cx + s * 0.33, cy + s * 0.1, s * 0.12, "rgba(255,140,160,0.6)");
    circle(ctx, cx + facing * s * 0.05, cy + s * 0.05, s * 0.03, "#ff7a99");
  } else {
    // alien
    ctx.strokeStyle = "#6cc7a0";
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    const sway = Math.sin(t * 4) * s * 0.06;
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + d * r * 0.3, cy - r * 0.8);
      ctx.quadraticCurveTo(cx + d * r * 0.5, cy - r * 1.3, cx + d * r * 0.55 + sway, cy - r * 1.45);
      ctx.stroke();
      circle(ctx, cx + d * r * 0.55 + sway, cy - r * 1.45, s * 0.08, "#ff8fc7");
    }
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.02, r * 0.95, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#9be8c4";
    ctx.fill();
    eyes(ctx, cx, cy - s * 0.04, s, facing, true);
    blush(ctx, cx, cy + s * 0.05, s);
    ctx.beginPath();
    ctx.arc(cx + facing * s * 0.05, cy + s * 0.17, s * 0.06, 0, Math.PI);
    ctx.strokeStyle = "#2b2140";
    ctx.lineWidth = Math.max(1, s * 0.025);
    ctx.stroke();
    circle(ctx, cx, cy + r * 0.6, s * 0.03, "#ffffff");
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  camY: number,
  viewH: number,
  t: number,
) {
  const progress = 1 - camY / Math.max(1, map.height - viewH);
  const g = ctx.createLinearGradient(0, camY, 0, camY + viewH);
  if (map.id === "cute") {
    g.addColorStop(0, progress > 0.6 ? "#c9b6ff" : "#a8dcff");
    g.addColorStop(1, "#ffd6ea");
  } else {
    g.addColorStop(0, "#1c1638");
    g.addColorStop(1, progress < 0.3 ? "#3d2e5c" : "#2a2350");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, camY, WORLD_W, viewH);

  const r = rng(map.id === "cute" ? 99 : 77);
  const count = 70;
  for (let i = 0; i < count; i++) {
    const wx = r() * WORLD_W;
    const wy = r() * map.height;
    const kind = r();
    const period = viewH + 200;
    const sy = camY - 100 + ((((wy - camY * 0.5) % period) + period) % period);
    if (map.id === "cute") {
      if (kind < 0.5) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        const s = 18 + kind * 30;
        circle(ctx, wx, sy, s, "rgba(255,255,255,0.8)");
        circle(ctx, wx + s, sy + 4, s * 0.8, "rgba(255,255,255,0.8)");
        circle(ctx, wx - s, sy + 6, s * 0.7, "rgba(255,255,255,0.8)");
      } else if (kind < 0.8) {
        const tw = 0.6 + Math.sin(t * 3 + i) * 0.4;
        ctx.fillStyle = `rgba(255,240,150,${tw})`;
        star(ctx, wx, sy, 7);
      } else {
        ctx.fillStyle = "rgba(255,130,170,0.6)";
        heart(ctx, wx, sy + Math.sin(t * 2 + i) * 6, 9);
      }
    } else {
      if (kind < 0.55) {
        const tw = 0.4 + Math.sin(t * 2 + i) * 0.3;
        circle(ctx, wx, sy, 1.8, `rgba(220,220,255,${tw})`);
      } else if (kind < 0.8) {
        ghost(ctx, wx + Math.sin(t + i) * 20, sy + Math.sin(t * 1.5 + i) * 10, 18);
      } else {
        bat(ctx, wx + Math.sin(t * 0.8 + i) * 60, sy, t + i);
      }
    }
  }
  if (map.id === "spooky") {
    circle(ctx, WORLD_W - 140, camY + 120, 60, "rgba(255,245,200,0.9)");
    circle(ctx, WORLD_W - 160, camY + 105, 10, "rgba(230,220,170,0.9)");
    circle(ctx, WORLD_W - 120, camY + 140, 7, "rgba(230,220,170,0.9)");
  }
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 === 0 ? s : s * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.8);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.5, y - s * 1.2, x, y - s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 1.2, x + s * 1.4, y - s * 0.2, x, y + s * 0.8);
  ctx.fill();
}

function ghost(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = "rgba(240,240,255,0.55)";
  ctx.beginPath();
  ctx.arc(x, y, s, Math.PI, 0);
  ctx.lineTo(x + s, y + s);
  for (let i = 0; i < 4; i++) {
    ctx.lineTo(x + s - (i + 0.5) * (s / 2), y + s * (i % 2 === 0 ? 0.7 : 1));
  }
  ctx.lineTo(x - s, y + s);
  ctx.closePath();
  ctx.fill();
  circle(ctx, x - s * 0.35, y - s * 0.1, s * 0.15, "rgba(40,30,70,0.8)");
  circle(ctx, x + s * 0.35, y - s * 0.1, s * 0.15, "rgba(40,30,70,0.8)");
}

function bat(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const f = Math.sin(t * 10) * 6;
  ctx.fillStyle = "rgba(20,10,35,0.85)";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 10, y - 8 - f, x - 20, y - f);
  ctx.quadraticCurveTo(x - 10, y + 2, x, y + 4);
  ctx.quadraticCurveTo(x + 10, y + 2, x + 20, y - f);
  ctx.quadraticCurveTo(x + 10, y - 8 - f, x, y);
  ctx.fill();
  circle(ctx, x, y + 1, 4, "rgba(20,10,35,0.9)");
  circle(ctx, x - 1.5, y, 0.9, "#ffd34d");
  circle(ctx, x + 1.5, y, 0.9, "#ffd34d");
}

export function drawPlatform(ctx: CanvasRenderingContext2D, map: MapData, p: Platform, t: number, ground: boolean) {
  const h = ground ? 60 : 22;
  if (map.id === "cute") {
    ctx.fillStyle = p.goal ? "#ffd84d" : ground ? "#9fe3b0" : "#ff9ec7";
    roundRect(ctx, p.x, p.y, p.w, h, 11);
    ctx.fill();
    ctx.fillStyle = ground ? "#c8f2d2" : "#fff3f8";
    roundRect(ctx, p.x, p.y, p.w, 9, 6);
    ctx.fill();
    if (!ground) {
      const colors = ["#7ad3ff", "#ffe066", "#a98bff", "#7ee8a6"];
      for (let i = 10; i < p.w - 6; i += 16) {
        ctx.fillStyle = colors[(i / 16 + (p.deco ?? 0)) % 4 | 0];
        ctx.fillRect(p.x + i, p.y + 13, 6, 3);
      }
    }
  } else {
    ctx.fillStyle = p.goal ? "#e7b94a" : ground ? "#2c2440" : "#5b5170";
    roundRect(ctx, p.x, p.y, p.w, h, 6);
    ctx.fill();
    ctx.fillStyle = p.goal ? "#ffe18a" : "#5f9a63";
    roundRect(ctx, p.x, p.y, p.w, 7, 4);
    ctx.fill();
    if (!ground && !p.goal && p.deco !== undefined) {
      if (p.deco === 0) {
        // gravestone
        ctx.fillStyle = "#8d86a0";
        roundRect(ctx, p.x + p.w - 30, p.y - 24, 18, 24, 8);
        ctx.fill();
        ctx.fillStyle = "#5b5170";
        ctx.fillRect(p.x + p.w - 22, p.y - 18, 2, 10);
        ctx.fillRect(p.x + p.w - 25, p.y - 15, 8, 2);
      } else if (p.deco === 1) {
        // pumpkin
        const px = p.x + 18, py = p.y - 9;
        ctx.fillStyle = "#ff8a2b";
        ctx.beginPath();
        ctx.ellipse(px, py, 11, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a6b2e";
        ctx.fillRect(px - 1.5, py - 13, 3, 5);
        const glow = 0.6 + Math.sin(t * 5) * 0.3;
        ctx.fillStyle = `rgba(255,230,120,${glow})`;
        ctx.beginPath();
        ctx.moveTo(px - 6, py - 2); ctx.lineTo(px - 3, py - 5); ctx.lineTo(px - 1, py - 2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px + 6, py - 2); ctx.lineTo(px + 3, py - 5); ctx.lineTo(px + 1, py - 2); ctx.fill();
        ctx.fillRect(px - 5, py + 2, 10, 2);
      }
    }
  }
  if (p.goal) {
    const fx = p.x + p.w / 2;
    ctx.fillStyle = map.id === "cute" ? "#ffffff" : "#d8d0e8";
    ctx.fillRect(fx - 2, p.y - 70, 4, 70);
    ctx.fillStyle = map.id === "cute" ? "#ff5f9e" : "#ff8a2b";
    ctx.beginPath();
    const wave = Math.sin(t * 5) * 4;
    ctx.moveTo(fx + 2, p.y - 70);
    ctx.lineTo(fx + 42, p.y - 60 + wave);
    ctx.lineTo(fx + 2, p.y - 48);
    ctx.fill();
    ctx.fillStyle = "#ffe066";
    star(ctx, fx, p.y - 78, 10);
  }
}

export function formatTime(ms: number) {
  const s = Math.max(0, ms) / 1000;
  const m = Math.floor(s / 60);
  const rest = (s % 60).toFixed(2).padStart(5, "0");
  return `${m}:${rest}`;
}
