export type CharId = "cat" | "dog" | "hamster" | "alien" | "capybara" | "axolotl" | "rabbit";
export type MapId = "cute" | "spooky" | "jelly" | "choco" | "forest" | "sea";
export type DiffId = "easy" | "normal" | "hard";

export const CHARACTERS: { id: CharId; name: string }[] = [
  { id: "cat", name: "고양이" },
  { id: "dog", name: "강아지" },
  { id: "hamster", name: "햄스터" },
  { id: "rabbit", name: "토끼" },
  { id: "capybara", name: "카피바라" },
  { id: "axolotl", name: "우파루파" },
  { id: "alien", name: "외계인" },
];

export const MAPS: { id: MapId; name: string; desc: string }[] = [
  { id: "cute", name: "솜사탕 하늘", desc: "알록달록 귀여운 사탕 구름 점프맵" },
  { id: "spooky", name: "으스스 유령 언덕", desc: "살짝 무서운 밤의 유령 점프맵" },
  { id: "jelly", name: "젤리 나라", desc: "말랑말랑 젤리가 가득한 달콤한 나라" },
  { id: "choco", name: "초콜릿 나라", desc: "달콤한 초콜릿 발판을 밟고 올라가요" },
  { id: "forest", name: "초록 숲", desc: "싱그러운 나무 사이를 뛰어올라요" },
  { id: "sea", name: "바닷속 세상", desc: "물방울과 물고기 사이를 헤엄쳐 올라가요" },
];

export const DIFFICULTIES: { id: DiffId; name: string; desc: string }[] = [
  { id: "easy", name: "쉬움", desc: "발판이 넓고 낮아요" },
  { id: "normal", name: "보통", desc: "적당히 도전!" },
  { id: "hard", name: "어려움", desc: "발판이 좁고 높아요" },
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
  diff: DiffId;
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

const DIFF_CFG: Record<DiffId, { levels: number; gap: number; wBase: number; wVar: number }> = {
  easy: { levels: 24, gap: 96, wBase: 125, wVar: 55 },
  normal: { levels: 42, gap: 108, wBase: 85, wVar: 70 },
  hard: { levels: 56, gap: 118, wBase: 60, wVar: 50 },
};

const MAP_SEED: Record<MapId, number> = {
  cute: 1234,
  spooky: 6666,
  jelly: 777,
  choco: 4242,
  forest: 314,
  sea: 9090,
};

export function buildMap(id: MapId, diff: DiffId = "normal"): MapData {
  const cfg = DIFF_CFG[diff];
  const r = rng(MAP_SEED[id] + (diff === "easy" ? 1 : diff === "hard" ? 2 : 0));
  const height = cfg.levels * cfg.gap + 400;
  const platforms: Platform[] = [];
  // ground
  platforms.push({ x: 0, y: height - 40, w: WORLD_W });
  let px = WORLD_W / 2;
  for (let i = 1; i <= cfg.levels; i++) {
    const w = i === cfg.levels ? 220 : cfg.wBase + r() * cfg.wVar - Math.min(i, 30);
    let nx = px + (r() * 2 - 1) * (diff === "hard" ? 260 : 230);
    if (Math.abs(nx - px) < 70) nx = px + (nx >= px ? 90 : -90);
    nx = Math.max(w / 2 + 10, Math.min(WORLD_W - w / 2 - 10, nx));
    if (i === cfg.levels) nx = WORLD_W / 2;
    platforms.push({
      x: nx - w / 2,
      y: height - 40 - i * cfg.gap,
      w,
      goal: i === cfg.levels,
      deco: Math.floor(r() * 6),
    });
    px = nx;
  }
  return { id, diff, height, platforms };
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
  } else if (char === "rabbit") {
    // long ears
    for (const d of [-1, 1]) {
      ctx.save();
      ctx.translate(cx + d * r * 0.35, cy - r * 0.8);
      ctx.rotate(d * 0.18 + Math.sin(t * 4 + d) * 0.06);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.55, r * 0.2, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#f7f4ff";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.5, r * 0.1, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#ffc7dd";
      ctx.fill();
      ctx.restore();
    }
    circle(ctx, cx, cy, r, "#f7f4ff");
    eyes(ctx, cx, cy - s * 0.04, s, facing);
    blush(ctx, cx, cy, s);
    circle(ctx, cx + facing * s * 0.05, cy + s * 0.04, s * 0.035, "#ff8fb0");
    // buck teeth
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx + facing * s * 0.05 - s * 0.05, cy + s * 0.12, s * 0.1, s * 0.09);
    ctx.strokeStyle = "#d8cfee";
    ctx.lineWidth = Math.max(1, s * 0.015);
    ctx.strokeRect(cx + facing * s * 0.05 - s * 0.05, cy + s * 0.12, s * 0.1, s * 0.09);
    ctx.beginPath();
    ctx.moveTo(cx + facing * s * 0.05, cy + s * 0.12);
    ctx.lineTo(cx + facing * s * 0.05, cy + s * 0.21);
    ctx.stroke();
  } else if (char === "capybara") {
    // chill capybara
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.05, r * 1.08, r * 0.95, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#b5824f";
    ctx.fill();
    circle(ctx, cx - r * 0.55, cy - r * 0.8, r * 0.16, "#8a5f36");
    circle(ctx, cx + r * 0.55, cy - r * 0.8, r * 0.16, "#8a5f36");
    // flat snout
    ctx.beginPath();
    ctx.ellipse(cx + facing * r * 0.25, cy + r * 0.25, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#c999645";
    ctx.fillStyle = "#c99964";
    ctx.fill();
    // sleepy eyes
    ctx.strokeStyle = "#3a2a1a";
    ctx.lineWidth = Math.max(1.2, s * 0.03);
    for (const dx of [-0.2, 0.2]) {
      ctx.beginPath();
      ctx.arc(cx + dx * s + facing * s * 0.05, cy - s * 0.08, s * 0.07, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    circle(ctx, cx + facing * r * 0.45, cy + r * 0.18, s * 0.04, "#3a2a1a");
    blush(ctx, cx, cy, s, "rgba(255,150,120,0.4)");
  } else if (char === "axolotl") {
    // 우파루파: pink with frilly gills
    for (const d of [-1, 1]) {
      ctx.strokeStyle = "#ff9ec7";
      ctx.lineWidth = Math.max(2, s * 0.06);
      ctx.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        const a = (i - 1) * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + d * r * 0.85, cy - r * 0.2);
        ctx.lineTo(
          cx + d * r * (1.25 + Math.cos(a) * 0.15),
          cy - r * 0.2 + Math.sin(a + (d > 0 ? 0 : Math.PI)) * r * 0.7 - r * 0.1 + Math.sin(t * 5 + i) * s * 0.03,
        );
        ctx.stroke();
      }
    }
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.05, r * 0.95, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd3e2";
    ctx.fill();
    circle(ctx, cx - s * 0.18 + facing * s * 0.05, cy - s * 0.06, s * 0.05, "#2b2140");
    circle(ctx, cx + s * 0.18 + facing * s * 0.05, cy - s * 0.06, s * 0.05, "#2b2140");
    blush(ctx, cx, cy, s, "rgba(255,110,160,0.6)");
    // big smile
    ctx.beginPath();
    ctx.arc(cx + facing * s * 0.04, cy + s * 0.1, s * 0.16, Math.PI * 0.15, Math.PI * 0.85);
    ctx.strokeStyle = "#d15b8a";
    ctx.lineWidth = Math.max(1.2, s * 0.03);
    ctx.stroke();
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

/* ---------------- backgrounds ---------------- */

interface Theme {
  skyTop: (progress: number) => string;
  skyBottom: (progress: number) => string;
}

const THEMES: Record<MapId, Theme> = {
  cute: {
    skyTop: (p) => (p > 0.6 ? "#c9b6ff" : "#a8dcff"),
    skyBottom: () => "#ffd6ea",
  },
  spooky: {
    skyTop: () => "#1c1638",
    skyBottom: (p) => (p < 0.3 ? "#3d2e5c" : "#2a2350"),
  },
  jelly: {
    skyTop: (p) => (p > 0.6 ? "#ffe3f1" : "#ffd0e8"),
    skyBottom: () => "#c8f0ff",
  },
  choco: {
    skyTop: (p) => (p > 0.6 ? "#f3d9b8" : "#e8c39a"),
    skyBottom: () => "#c98d5e",
  },
  forest: {
    skyTop: (p) => (p > 0.6 ? "#cdeeb0" : "#a8de9a"),
    skyBottom: () => "#e4f6cf",
  },
  sea: {
    skyTop: (p) => (p > 0.6 ? "#7ec8f2" : "#4fa8e0"),
    skyBottom: () => "#1f5f9e",
  },
};

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  camY: number,
  viewH: number,
  t: number,
) {
  const progress = 1 - camY / Math.max(1, map.height - viewH);
  const theme = THEMES[map.id];
  const g = ctx.createLinearGradient(0, camY, 0, camY + viewH);
  g.addColorStop(0, theme.skyTop(progress));
  g.addColorStop(1, theme.skyBottom(progress));
  ctx.fillStyle = g;
  ctx.fillRect(0, camY, WORLD_W, viewH);

  const r = rng(MAP_SEED[map.id] + 99);
  const count = 70;
  for (let i = 0; i < count; i++) {
    const wx = r() * WORLD_W;
    const wy = r() * map.height;
    const kind = r();
    const period = viewH + 200;
    const sy = camY - 100 + ((((wy - camY * 0.5) % period) + period) % period);
    if (map.id === "cute") {
      if (kind < 0.5) {
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
    } else if (map.id === "spooky") {
      if (kind < 0.55) {
        const tw = 0.4 + Math.sin(t * 2 + i) * 0.3;
        circle(ctx, wx, sy, 1.8, `rgba(220,220,255,${tw})`);
      } else if (kind < 0.8) {
        ghost(ctx, wx + Math.sin(t + i) * 20, sy + Math.sin(t * 1.5 + i) * 10, 18);
      } else {
        bat(ctx, wx + Math.sin(t * 0.8 + i) * 60, sy, t + i);
      }
    } else if (map.id === "jelly") {
      if (kind < 0.4) {
        jellyBean(ctx, wx, sy + Math.sin(t * 2 + i) * 8, 10 + kind * 14, i);
      } else if (kind < 0.7) {
        gumdrop(ctx, wx, sy + Math.sin(t * 1.5 + i) * 10, 12 + kind * 10, i);
      } else {
        const tw = 0.5 + Math.sin(t * 3 + i) * 0.4;
        ctx.fillStyle = `rgba(255,255,255,${tw})`;
        star(ctx, wx, sy, 6);
      }
    } else if (map.id === "choco") {
      if (kind < 0.45) {
        chocoBar(ctx, wx, sy + Math.sin(t + i) * 6, i);
      } else if (kind < 0.75) {
        const colors = ["#ff6b8a", "#7ad3ff", "#ffe066", "#7ee8a6"];
        circle(ctx, wx, sy, 5 + kind * 5, colors[i % 4]!);
        circle(ctx, wx - 1.5, sy - 1.5, 2, "rgba(255,255,255,0.7)");
      } else {
        candyCane(ctx, wx, sy + Math.sin(t * 1.2 + i) * 8, t + i);
      }
    } else if (map.id === "forest") {
      if (kind < 0.45) {
        tree(ctx, wx, sy, 24 + kind * 30);
      } else if (kind < 0.8) {
        leaf(ctx, wx + Math.sin(t * 1.5 + i) * 25, sy + ((t * 20 + i * 37) % 60), i);
      } else {
        ctx.fillStyle = "rgba(255,220,90,0.8)";
        star(ctx, wx, sy, 5);
      }
    } else {
      // sea
      if (kind < 0.45) {
        const by = sy - ((t * 30 + i * 53) % (viewH + 200));
        circle(ctx, wx, by + viewH + 100 - viewH, 3 + kind * 8, "rgba(255,255,255,0.35)");
        circle(ctx, wx - 1, by + viewH - 1 - 100 + 100, 1.5, "rgba(255,255,255,0.5)");
      } else if (kind < 0.75) {
        fish(ctx, wx + Math.sin(t * 0.9 + i) * 40, sy, 12 + kind * 8, i % 2 === 0 ? 1 : -1, i);
      } else {
        seaweed(ctx, wx, sy, 20 + kind * 20, t + i);
      }
    }
  }
  if (map.id === "spooky") {
    circle(ctx, WORLD_W - 140, camY + 120, 60, "rgba(255,245,200,0.9)");
    circle(ctx, WORLD_W - 160, camY + 105, 10, "rgba(230,220,170,0.9)");
    circle(ctx, WORLD_W - 120, camY + 140, 7, "rgba(230,220,170,0.9)");
  } else if (map.id === "forest") {
    circle(ctx, WORLD_W - 130, camY + 110, 45, "rgba(255,235,140,0.95)");
    circle(ctx, WORLD_W - 130, camY + 110, 55, "rgba(255,235,140,0.3)");
  } else if (map.id === "sea") {
    // light rays
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const bx = 120 + i * 240 + Math.sin(t * 0.5 + i) * 20;
      ctx.moveTo(bx, camY);
      ctx.lineTo(bx + 90, camY);
      ctx.lineTo(bx + 160, camY + viewH);
      ctx.lineTo(bx + 30, camY + viewH);
      ctx.fill();
    }
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

function jellyBean(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, i: number) {
  const colors = ["rgba(255,140,180,0.75)", "rgba(140,220,255,0.75)", "rgba(255,220,120,0.75)", "rgba(170,255,190,0.75)"];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(i) * 0.6);
  ctx.beginPath();
  ctx.ellipse(0, 0, s, s * 0.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = colors[i % 4]!;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-s * 0.3, -s * 0.2, s * 0.3, s * 0.15, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fill();
  ctx.restore();
}

function gumdrop(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, i: number) {
  const colors = ["rgba(255,120,120,0.7)", "rgba(150,120,255,0.7)", "rgba(120,220,180,0.7)"];
  ctx.beginPath();
  ctx.moveTo(x - s, y + s * 0.4);
  ctx.quadraticCurveTo(x - s, y - s, x, y - s);
  ctx.quadraticCurveTo(x + s, y - s, x + s, y + s * 0.4);
  ctx.closePath();
  ctx.fillStyle = colors[i % 3]!;
  ctx.fill();
  circle(ctx, x - s * 0.3, y - s * 0.3, s * 0.18, "rgba(255,255,255,0.6)");
}

function chocoBar(ctx: CanvasRenderingContext2D, x: number, y: number, i: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(i * 2) * 0.5);
  ctx.fillStyle = "rgba(122,74,42,0.8)";
  roundRect(ctx, -14, -10, 28, 20, 3);
  ctx.fill();
  ctx.fillStyle = "rgba(90,52,28,0.8)";
  for (let dx = -1; dx <= 1; dx++) for (let dy = 0; dy < 2; dy++) {
    roundRect(ctx, dx * 9 - 3.5, dy * 9 - 8, 7, 7, 2);
    ctx.fill();
  }
  ctx.restore();
}

function candyCane(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t) * 0.3);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.lineTo(0, -8);
  ctx.arc(6, -8, 6, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,90,110,0.85)";
  ctx.lineWidth = 2.5;
  for (let i = -2; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-3, i * 5 + 8);
    ctx.lineTo(3, i * 5 + 4);
    ctx.stroke();
  }
  ctx.restore();
}

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = "rgba(120,84,50,0.55)";
  ctx.fillRect(x - s * 0.08, y, s * 0.16, s * 0.5);
  ctx.fillStyle = "rgba(90,160,80,0.5)";
  circle(ctx, x, y - s * 0.2, s * 0.45, "rgba(90,160,80,0.5)");
  circle(ctx, x - s * 0.3, y, s * 0.3, "rgba(110,180,90,0.5)");
  circle(ctx, x + s * 0.3, y, s * 0.3, "rgba(110,180,90,0.5)");
}

function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, i: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(i + y * 0.05);
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = ["rgba(110,190,90,0.7)", "rgba(240,190,80,0.7)", "rgba(230,130,80,0.7)"][i % 3]!;
  ctx.fill();
  ctx.restore();
}

function fish(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dir: number, i: number) {
  const colors = ["rgba(255,170,90,0.75)", "rgba(255,120,150,0.75)", "rgba(255,220,110,0.75)"];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.beginPath();
  ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = colors[i % 3]!;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.9, 0);
  ctx.lineTo(-s * 1.5, -s * 0.5);
  ctx.lineTo(-s * 1.5, s * 0.5);
  ctx.closePath();
  ctx.fill();
  circle(ctx, s * 0.45, -s * 0.1, s * 0.12, "#1c2a3a");
  ctx.restore();
}

function seaweed(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, t: number) {
  ctx.strokeStyle = "rgba(60,160,110,0.55)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.quadraticCurveTo(x + Math.sin(t) * 12, y + h * 0.5, x + Math.sin(t * 1.3) * 8, y);
  ctx.stroke();
}

/* ---------------- platforms ---------------- */

interface PlatformStyle {
  body: string;
  top: string;
  goalBody: string;
  goalTop: string;
  ground: string;
  groundTop: string;
  radius: number;
}

const PLATFORM_STYLES: Record<MapId, PlatformStyle> = {
  cute: { body: "#ff9ec7", top: "#fff3f8", goalBody: "#ffd84d", goalTop: "#ffe98a", ground: "#9fe3b0", groundTop: "#c8f2d2", radius: 11 },
  spooky: { body: "#5b5170", top: "#5f9a63", goalBody: "#e7b94a", goalTop: "#ffe18a", ground: "#2c2440", groundTop: "#5f9a63", radius: 6 },
  jelly: { body: "#ff8fb8", top: "#ffd9ea", goalBody: "#ffb84d", goalTop: "#ffe1a0", ground: "#8adcf0", groundTop: "#c8f2fc", radius: 11 },
  choco: { body: "#7a4a2a", top: "#f6e3c8", goalBody: "#e7a94a", goalTop: "#ffe18a", ground: "#5a3620", groundTop: "#c98d5e", radius: 6 },
  forest: { body: "#7c5a38", top: "#7fce6e", goalBody: "#ffd84d", goalTop: "#ffe98a", ground: "#5f8f4e", groundTop: "#93d183", radius: 8 },
  sea: { body: "#e8c98f", top: "#fdf0d2", goalBody: "#ffd84d", goalTop: "#ffe98a", ground: "#3f7fae", groundTop: "#7ec8e8", radius: 10 },
};

export function drawPlatform(ctx: CanvasRenderingContext2D, map: MapData, p: Platform, t: number, ground: boolean) {
  const st = PLATFORM_STYLES[map.id];
  const h = ground ? 60 : 22;
  ctx.fillStyle = p.goal ? st.goalBody : ground ? st.ground : st.body;
  roundRect(ctx, p.x, p.y, p.w, h, st.radius);
  ctx.fill();
  ctx.fillStyle = p.goal ? st.goalTop : ground ? st.groundTop : st.top;
  roundRect(ctx, p.x, p.y, p.w, ground ? 12 : 9, Math.min(6, st.radius));
  ctx.fill();

  if (!ground && !p.goal) {
    if (map.id === "cute" || map.id === "jelly") {
      const colors = map.id === "cute"
        ? ["#7ad3ff", "#ffe066", "#a98bff", "#7ee8a6"]
        : ["#ffffff", "#ffe066", "#7ad3ff", "#c9a6ff"];
      for (let i = 10; i < p.w - 6; i += 16) {
        ctx.fillStyle = colors[(i / 16 + (p.deco ?? 0)) % 4 | 0] ?? "#ffffff";
        ctx.fillRect(p.x + i, p.y + 13, 6, 3);
      }
    } else if (map.id === "choco") {
      // chocolate squares
      ctx.fillStyle = "rgba(60,34,18,0.6)";
      for (let i = 12; i < p.w - 10; i += 20) {
        roundRect(ctx, p.x + i, p.y + 11, 10, 7, 2);
        ctx.fill();
      }
    } else if (map.id === "forest") {
      // little flowers/leaves on the grass
      for (let i = 8; i < p.w - 6; i += 22) {
        circle(ctx, p.x + i, p.y + 3, 3, (i + (p.deco ?? 0)) % 3 === 0 ? "#ff9ec7" : "#fff6b8");
      }
    } else if (map.id === "sea") {
      // shells and bubbles
      for (let i = 12; i < p.w - 8; i += 24) {
        if ((i + (p.deco ?? 0)) % 2 === 0) circle(ctx, p.x + i, p.y + 14, 3, "rgba(255,255,255,0.5)");
        else {
          ctx.fillStyle = "#ffb6c9";
          ctx.beginPath();
          ctx.arc(p.x + i, p.y + 15, 4, Math.PI, 0);
          ctx.fill();
        }
      }
    } else if (map.id === "spooky" && p.deco !== undefined) {
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
    ctx.fillStyle = map.id === "spooky" ? "#d8d0e8" : "#ffffff";
    ctx.fillRect(fx - 2, p.y - 70, 4, 70);
    ctx.fillStyle = map.id === "spooky" ? "#ff8a2b" : "#ff5f9e";
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
