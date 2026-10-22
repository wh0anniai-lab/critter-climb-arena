import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildMap,

  drawBackground,
  drawCharacter,
  drawPlatform,
  formatTime,
  GRAVITY,
  JUMP_V,
  MAPS,
  MAX_PUSHES,
  MOVE_SPEED,
  PLAYER_SIZE,
  WORLD_W,
  DIFFICULTIES,
  type CharId,
  type DiffId,
  type MapData,
  type MapId,
} from "@/lib/game";
import { CharacterPreview } from "@/components/CharacterPreview";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { MAP_IMAGES } from "@/lib/map-images";

const CHAR_IDS: CharId[] = ["cat", "dog", "hamster", "alien", "capybara", "axolotl", "rabbit"];
const MAP_IDS: MapId[] = ["cute", "spooky", "jelly", "choco", "forest", "sea"];
const DIFF_IDS: DiffId[] = ["easy", "normal", "hard"];

type Search = { name: string; char: CharId; host: boolean; map: MapId; diff: DiffId };

export const Route = createFileRoute("/room/$code")({
  validateSearch: (raw: Record<string, unknown>): Search => { const s = raw as { name?: unknown; char?: unknown; host?: unknown; map?: unknown; diff?: unknown }; return {
    name: typeof s.name === "string" && s.name ? s.name.slice(0, 10) : "익명",
    char: (CHAR_IDS.includes(s.char as CharId) ? s.char : "cat") as CharId,
    host: s.host === true || s.host === "true",
    map: (MAP_IDS.includes(s.map as MapId) ? s.map : "cute") as MapId,
    diff: (DIFF_IDS.includes(s.diff as DiffId) ? s.diff : "normal") as DiffId,
  }; },
  head: ({ params }) => ({
    meta: [
      { title: `서버 ${params.code} — 점프맵` },
      { name: "description", content: "친구들과 같은 서버에서 점프맵 꼭대기 레이스 중!" },
      { property: "og:title", content: `서버 ${params.code} — 점프맵` },
      { property: "og:description", content: "서버 번호를 입력하고 함께 달려요!" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Room,
});

interface Meta {
  id: string;
  name: string;
  char: CharId;
  host: boolean;
  map?: MapId;
  diff?: DiffId;
  startAt?: number;
  finishTime?: number;
}

interface Remote {
  x: number; y: number; tx: number; ty: number; facing: number; moving: boolean;
}

function Room() {
  const { code } = Route.useParams();
  const search = Route.useSearch();
  const myId = useMemo(() => Math.random().toString(36).slice(2, 10), []);

  const [players, setPlayers] = useState<Meta[]>([]);
  const [mapId, setMapId] = useState<MapId | null>(search.host ? search.map : null);
  const [diffId, setDiffId] = useState<DiffId | null>(search.host ? search.diff : null);
  const [liveRanks, setLiveRanks] = useState<{ id: string; name: string; y: number }[]>([]);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [myFinish, setMyFinish] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [recordError, setRecordError] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const metaRef = useRef<Meta>({
    id: myId,
    name: search.name,
    char: search.char,
    host: search.host,
    ...(search.host ? { map: search.map, diff: search.diff } : {}),
  });
  const keysRef = useRef<Set<string> | null>(null);
  const pushFnRef = useRef<(() => void) | null>(null);
  const remotes = useRef(new Map<string, Remote>());
  const playersRef = useRef<Meta[]>([]);
  const startRef = useRef<number | null>(null);
  const finishRef = useRef<number | null>(null);
  const pushedRef = useRef<{ dir: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  playersRef.current = players;
  startRef.current = startAt;
  finishRef.current = myFinish;

  // ---------- networking ----------
  useEffect(() => {
    const ch = supabase.channel(`jump-room:${code}`, {
      config: { presence: { key: myId }, broadcast: { self: false } },
    });
    channelRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const list: Meta[] = Object.values(state).map((arr) => arr[0] as unknown as Meta | undefined).filter((m): m is Meta => !!m);
      setPlayers(list);
      const host: Meta | undefined = list.find((p) => p.host && p.map);
      if (host) {
        setNotFound(false);
        const hostMap = host.map;
        if (hostMap) setMapId((m) => m ?? hostMap);
        setDiffId((d) => d ?? host.diff ?? "normal");
        const hostStart = host.startAt;
        if (hostStart) setStartAt((s) => s ?? hostStart);
      }
      for (const id of remotes.current.keys()) if (!(state as Record<string, unknown>)[id]) remotes.current.delete(id);
    });
    ch.on("broadcast", { event: "pos" }, ({ payload }) => {
      const p = payload as { id: string; x: number; y: number; f: number; m: boolean };
      const r = remotes.current.get(p.id);
      if (r) Object.assign(r, { tx: p.x, ty: p.y, facing: p.f, moving: p.m });
      else remotes.current.set(p.id, { x: p.x, y: p.y, tx: p.x, ty: p.y, facing: p.f, moving: p.m });
    });
    ch.on("broadcast", { event: "start" }, ({ payload }) => {
      setStartAt((s) => s ?? (payload as { startAt: number }).startAt);
    });
    ch.on("broadcast", { event: "push" }, ({ payload }) => {
      const p = payload as { target: string; dir: number };
      if (p.target === myId) pushedRef.current = { dir: p.dir };
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setConnected(true);
        await ch.track(metaRef.current);
      }
    });
    return () => {
      supabase.removeChannel(ch);
    };
  }, [code, myId]);

  // joiner: no host found
  useEffect(() => {
    if (search.host || mapId) return;
    const t = setTimeout(() => setNotFound(true), 5000);
    return () => clearTimeout(t);
  }, [search.host, mapId]);

  const startGame = async () => {
    if (!search.host || !connected || startRef.current !== null) return;
    const at = Date.now() + 3000;
    startRef.current = at;
    setStartAt(at);
    metaRef.current = { ...metaRef.current, startAt: at };
    await channelRef.current?.track(metaRef.current);
    channelRef.current?.send({ type: "broadcast", event: "start", payload: { startAt: at } });
  };

  // ---------- game loop ----------
  useEffect(() => {
    if (!mapId || !diffId) return;
    const map: MapData = buildMap(mapId, diffId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scenery = new Image();
    scenery.src = MAP_IMAGES[mapId];
    const keys = new Set<string>();
    const me = {
      x: 80 + Math.random() * (WORLD_W - 160),
      y: map.height - 40,
      vy: 0,
      pushVx: 0,
      onGround: true,
      facing: 1,
      moving: false,
      pushes: MAX_PUSHES,
      lastPush: 0,
      jumpHeld: false,
    };
    const effects: { x: number; y: number; t: number; text: string }[] = [];
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastSend = 0;
    let camY = map.height;

    const kd = (e: KeyboardEvent) => {
      if (["Space", "KeyA", "KeyS", "KeyD"].includes(e.code)) e.preventDefault();
      keys.add(e.code);
      if (e.code === "KeyA" && !e.repeat) tryPush();
    };
    const ku = (e: KeyboardEvent) => keys.delete(e.code);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    keysRef.current = keys;
    pushFnRef.current = tryPush;
    const rankTimer = window.setInterval(() => {
      const ranks = playersRef.current.map((p) => {
        const r = p.id === myId ? { y: me.y } : remotes.current.get(p.id);
        return { id: p.id, name: p.name, y: r ? r.y : map.height };
      });
      ranks.sort((a, b) => a.y - b.y);
      setLiveRanks(ranks);
    }, 500);

    const playing = () => {
      const s = startRef.current;
      return s !== null && Date.now() >= s && finishRef.current === null;
    };

    function tryPush() {
      if (!playing() || me.pushes <= 0) return;
      const now = performance.now();
      if (now - me.lastPush < 400) return;
      me.lastPush = now;
      me.pushes--;
      let best: string | null = null;
      let bestD = 70;
      for (const [id, r] of remotes.current) {
        const d = Math.hypot(r.x - me.x, r.y - me.y);
        if (d < bestD) { bestD = d; best = id; }
      }
      if (best) {
        const r = remotes.current.get(best);
        if (!r) return;
        const dir = r.x >= me.x ? 1 : -1;
        channelRef.current?.send({ type: "broadcast", event: "push", payload: { target: best, dir } });
        effects.push({ x: (r.x + me.x) / 2, y: me.y - PLAYER_SIZE, t: 0, text: "퍽!" });
      } else {
        effects.push({ x: me.x + me.facing * 30, y: me.y - PLAYER_SIZE, t: 0, text: "휙~" });
      }
    }

    const step = () => {
      const canMove = playing();
      let dir = 0;
      if (canMove) {
        if (keys.has("KeyD")) dir += 1;
        if (keys.has("KeyS")) dir -= 1;
      }
      if (dir !== 0) me.facing = dir;
      me.moving = dir !== 0;
      if (pushedRef.current) {
        me.pushVx = pushedRef.current.dir * 13;
        me.vy = Math.min(me.vy, -6);
        me.onGround = false;
        effects.push({ x: me.x, y: me.y - PLAYER_SIZE - 10, t: 0, text: "으앗!" });
        pushedRef.current = null;
      }
      const jump = canMove && keys.has("Space");
      if (jump && me.onGround && !me.jumpHeld) {
        me.vy = JUMP_V;
        me.onGround = false;
      }
      me.jumpHeld = jump;
      if (!jump && me.vy < -4) me.vy += GRAVITY; // variable jump height

      me.pushVx *= 0.9;
      if (Math.abs(me.pushVx) < 0.1) me.pushVx = 0;
      me.x += dir * MOVE_SPEED + me.pushVx;
      const half = PLAYER_SIZE * 0.4;
      me.x = Math.max(half, Math.min(WORLD_W - half, me.x));

      const prevY = me.y;
      me.vy = Math.min(me.vy + GRAVITY, 16);
      me.y += me.vy;
      me.onGround = false;
      if (me.vy >= 0) {
        for (const p of map.platforms) {
          if (me.x + half * 0.7 < p.x || me.x - half * 0.7 > p.x + p.w) continue;
          if (prevY <= p.y + 0.5 && me.y >= p.y) {
            me.y = p.y;
            me.vy = 0;
            me.onGround = true;
            if (p.goal && finishRef.current === null && startRef.current !== null) {
              const time = Date.now() - startRef.current;
              finishRef.current = time;
              setMyFinish(time);
              metaRef.current = { ...metaRef.current, finishTime: time };
              channelRef.current?.track(metaRef.current);
              const db = supabase as unknown as { from: (t: string) => { insert: (v: Record<string, unknown>) => Promise<unknown> } };
              void db.from("records").insert({
                name: search.name,
                char: search.char,
                map: map.id,
                diff: map.diff,
                time_ms: time,
              });
            }
            break;
          }
        }
      }
    };

    const render = (t: number) => {
      const dpr = window.devicePixelRatio || 1;
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
      }
      const scale = (cw / WORLD_W) * dpr;
      const viewH = (ch * dpr) / scale;
      const target = Math.max(0, Math.min(map.height - viewH, me.y - viewH * 0.62));
      camY += (target - camY) * 0.12;
      if (camY > map.height - viewH) camY = map.height - viewH;

      ctx.setTransform(scale, 0, 0, scale, 0, -camY * scale);
      drawBackground(ctx, map, camY, viewH, t);
      if (scenery.complete && scenery.naturalWidth > 0) {
        ctx.globalAlpha = 0.25;
        ctx.drawImage(scenery, 0, camY, WORLD_W, viewH);
        ctx.globalAlpha = 1;
      }
      for (let i = 0; i < map.platforms.length; i++) {
        const p = map.platforms[i];
        if (!p) continue;
        if (p.y < camY - 100 || p.y > camY + viewH + 80) continue;
        drawPlatform(ctx, map, p, t, i === 0);
      }

      const metas = new Map(playersRef.current.map((p) => [p.id, p]));
      ctx.font = "14px Jua, sans-serif";
      ctx.textAlign = "center";
      for (const [id, r] of remotes.current) {
        r.x += (r.tx - r.x) * 0.3;
        r.y += (r.ty - r.y) * 0.3;
        const m = metas.get(id);
        if (!m) continue;
        ctx.globalAlpha = 0.9;
        drawCharacter(ctx, m.char, r.x, r.y, PLAYER_SIZE, r.facing, t, r.moving);
        ctx.globalAlpha = 1;
        label(m.name, r.x, r.y - PLAYER_SIZE - 14, false);
      }
      drawCharacter(ctx, search.char, me.x, me.y, PLAYER_SIZE, me.facing, t, me.moving && me.onGround);
      label(search.name + " (나)", me.x, me.y - PLAYER_SIZE - 14, true);

      for (const e of effects) {
        e.t += 1 / 60;
        ctx.globalAlpha = Math.max(0, 1 - e.t / 0.7);
        ctx.font = "22px Jua, sans-serif";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ffffff";
        ctx.strokeText(e.text, e.x, e.y - e.t * 40);
        ctx.fillStyle = "#ff4f8b";
        ctx.fillText(e.text, e.x, e.y - e.t * 40);
        ctx.globalAlpha = 1;
      }
      for (let i = effects.length - 1; i >= 0; i--) if ((effects[i]?.t ?? 0) > 0.7) effects.splice(i, 1);

      // HUD (screen space)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const s = startRef.current;
      const darkHud = mapId === "spooky" || mapId === "sea";
      const hudBg = darkHud ? "rgba(30,20,50,0.75)" : "rgba(255,255,255,0.85)";
      const hudFg = darkHud ? "#f3eaff" : "#5a3b74";
      ctx.fillStyle = hudBg;
      ctx.beginPath(); ctx.roundRect(12, 12, 190, 74, 14); ctx.fill();
      ctx.fillStyle = hudFg;
      ctx.textAlign = "left";
      ctx.font = "26px Jua, sans-serif";
      const elapsed = finishRef.current ?? (s && Date.now() > s ? Date.now() - s : 0);
      ctx.fillText("⏱ " + formatTime(elapsed), 24, 44);
      ctx.font = "18px Jua, sans-serif";
      ctx.fillText(`밀치기 ${me.pushes}/${MAX_PUSHES}`, 24, 72);
      const prog = 1 - (me.y - (map.platforms.at(-1)?.y ?? 360)) / (map.height - 40 - (map.platforms.at(-1)?.y ?? 360));
      ctx.fillStyle = hudBg;
      ctx.beginPath(); ctx.roundRect(cw - 34, 12, 22, ch - 24, 11); ctx.fill();
      ctx.fillStyle = "#ff7ab0";
      const ph = (ch - 32) * Math.max(0, Math.min(1, prog));
      ctx.beginPath(); ctx.roundRect(cw - 30, ch - 16 - ph, 14, ph, 7); ctx.fill();

      if (s && Date.now() < s) {
        const n = Math.ceil((s - Date.now()) / 1000);
        ctx.textAlign = "center";
        ctx.font = "120px Jua, sans-serif";
        ctx.lineWidth = 10;
        ctx.strokeStyle = "#ffffff";
        ctx.strokeText(String(n), cw / 2, ch / 2);
        ctx.fillStyle = "#ff4f8b";
        ctx.fillText(String(n), cw / 2, ch / 2);
      }
    };

    function label(text: string, x: number, y: number, mine: boolean) {
      ctx.font = "15px Jua, sans-serif";
      ctx.textAlign = "center";
      const w = ctx.measureText(text).width + 14;
      ctx.fillStyle = mine ? "rgba(255,95,158,0.9)" : "rgba(40,30,60,0.6)";
      ctx.beginPath(); ctx.roundRect(x - w / 2, y - 14, w, 20, 10); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, x, y + 1);
    }

    const loop = (now: number) => {
      acc += Math.min(100, now - last);
      last = now;
      while (acc >= 1000 / 60) {
        step();
        acc -= 1000 / 60;
      }
      render(now / 1000);
      if (now - lastSend > 66) {
        lastSend = now;
        channelRef.current?.send({
          type: "broadcast",
          event: "pos",
          payload: { id: myId, x: Math.round(me.x), y: Math.round(me.y), f: me.facing, m: me.moving },
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.clearInterval(rankTimer);
      keysRef.current = null;
      pushFnRef.current = null;
    };
  }, [mapId, diffId, myId, search.char, search.name]);

  const finishers = players
    .filter((p) => typeof p.finishTime === "number")
    .sort((a, b) => (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity));
  const mapInfo = MAPS.find((m) => m.id === mapId);
  const diffInfo = DIFFICULTIES.find((d) => d.id === diffId);
  const isHost = search.host;

  const holdKey = (keyCode: string, down: boolean) => {
    const keys = keysRef.current;
    if (!keys) return;
    if (down) keys.add(keyCode);
    else keys.delete(keyCode);
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden touch-none">
      <canvas ref={canvasRef} aria-label="점프맵 경주 화면" className="block h-full w-full" />
      <Button variant="outline" onClick={() => setLeaving(true)} className="btn-chunky absolute left-3 top-24 z-10 h-auto bg-card text-base"><LogOut />나가기</Button>

      <div className="card-chunky absolute right-12 top-3 max-h-[40dvh] w-40 overflow-y-auto p-3 text-base sm:w-56">
        <div className="font-display text-lg">서버 <span className="text-primary">{code}</span></div>
        <div className="text-sm text-muted-foreground">{mapInfo?.name ?? "..."} · {diffInfo?.name ?? ""} · {players.length}명</div>
        {startAt && !myFinish && liveRanks.length > 0 && (
          <>
            <div className="mt-2 font-display">🏁 실시간 순위</div>
            <ul className="mt-1 space-y-1">
              {liveRanks.slice(0, 5).map((p, i) => (
                <li key={p.id} className="flex gap-1">
                  <span>{["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`}</span>
                  <span className="truncate">{p.id === myId ? "⭐ " : ""}{p.name}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <ul className="mt-2 space-y-1">
          {players.map((p) => (
            <li key={p.id} className="flex justify-between gap-2">
              <span className="truncate">{p.id === myId ? "⭐ " : ""}{p.name}</span>
              {typeof p.finishTime === "number" && <span className="font-display text-primary">{formatTime(p.finishTime)}</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-4" style={{ touchAction: "none" }}>
        <div className="pointer-events-auto flex gap-3">
          <TouchBtn label="◀" onHold={(down) => holdKey("KeyS", down)} />
          <TouchBtn label="▶" onHold={(down) => holdKey("KeyD", down)} />
        </div>
        <div className="pointer-events-auto flex gap-3">
          <TouchBtn label="👊" onTap={() => pushFnRef.current?.()} />
          <TouchBtn label="⤒" big onHold={(down) => holdKey("Space", down)} />
        </div>
      </div>

      {notFound && (
        <Overlay>
          <h2 className="text-3xl">서버 "{code}"를 찾을 수 없어요 😢</h2>
          <p className="mt-2 text-muted-foreground">친구가 서버를 만들었는지, 번호가 맞는지 확인해 주세요.</p>
          <Link to="/" className="btn-chunky mt-5 inline-block bg-primary text-xl text-primary-foreground">처음으로</Link>
        </Overlay>
      )}

      {!notFound && !startAt && (
        <Overlay>
          <p className="text-muted-foreground">서버 이름</p>
          <h2 className="font-display text-6xl tracking-widest text-primary">{code}</h2>
          <p className="mt-1 text-muted-foreground">친구에게 이 번호를 알려주세요!</p>
          <p className="mt-3 text-lg">맵: {mapInfo?.name ?? (connected ? "서버 찾는 중..." : "연결 중...")} · 난이도: {diffInfo?.name ?? "..."}</p>
          <div className="my-4 flex flex-wrap justify-center gap-3">
            {players.map((p) => (
              <div key={p.id} className="flex flex-col items-center">
                <CharacterPreview char={p.char} size={64} />
                <span>{p.name}{p.host ? " 👑" : ""}</span>
              </div>
            ))}
          </div>
          {isHost ? (
            <Button disabled={!connected} onClick={startGame} className="btn-chunky h-auto bg-primary text-2xl text-primary-foreground">
              게임 시작!
            </Button>
          ) : (
            <p className="text-xl">방장이 시작하기를 기다리는 중... ⏳</p>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="kbd">Space</span> 점프 · <span className="kbd">D</span> 앞 · <span className="kbd">S</span> 뒤 · <span className="kbd">A</span> 밀치기({MAX_PUSHES}번)
            <br />화면 아래 버튼을 터치해도 돼요!
          </p>
        </Overlay>
      )}

      {leaving && <div className="absolute inset-0 z-30 flex items-center justify-center bg-overlay p-4"><div role="dialog" aria-modal="true" aria-labelledby="leave-title" className="card-chunky max-w-sm p-6 text-center"><h2 id="leave-title" className="text-2xl">서버에서 나갈까요?</h2><p className="mt-2">완주 전에는 기록이 저장되지 않아요.</p><div className="mt-5 flex justify-center gap-3"><Button variant="outline" onClick={() => setLeaving(false)}>계속하기</Button><Button asChild variant="destructive"><Link to="/">나가기</Link></Button></div></div></div>}

      {myFinish !== null && (
        <Overlay>
          <h2 className="text-4xl text-primary">🎉 꼭대기 도착! 🎉</h2>
          <p className="mt-2 text-2xl">내 기록: <span className="font-display">{formatTime(myFinish)}</span></p>
          <ol className="mx-auto mt-4 max-w-xs space-y-1 text-left text-xl">
            {finishers.map((p, i) => (
              <li key={p.id} className="flex justify-between">
                <span>{["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`} {p.name}</span>
                <span className="font-display">{formatTime(p.finishTime ?? 0)}</span>
              </li>
            ))}
          </ol>
          {recordError && <p role="alert" className="mt-3 text-destructive">기록을 저장하지 못했어요. 이 화면에서 기록을 확인해 주세요.</p>}
           <p className="mt-3 text-sm text-muted-foreground">게임 종료! 다른 친구들의 기록도 계속 올라와요.</p>
          <Link to="/" className="btn-chunky mt-5 inline-block bg-secondary text-xl text-secondary-foreground">처음으로</Link>
        </Overlay>
      )}
    </main>
  );
}

function TouchBtn({ label, big, onHold, onTap }: { label: string; big?: boolean; onHold?: (down: boolean) => void; onTap?: () => void }) {
  const cls = `btn-chunky touch-none select-none bg-card/90 text-card-foreground font-display ${big ? "h-24 w-24 text-4xl" : "h-16 w-16 text-2xl"}`;
  if (onTap) {
    return (
      <Button variant="outline" type="button" aria-label={label === "◀" ? "왼쪽 이동" : label === "▶" ? "오른쪽 이동" : label === "👊" ? "밀치기" : "점프"} className={cls}
        onPointerDown={(e) => { e.preventDefault(); onTap(); }}>
        {label}
      </Button>
    );
  }
  return (
    <Button variant="outline" type="button" aria-label={label === "◀" ? "왼쪽 이동" : label === "▶" ? "오른쪽 이동" : label === "👊" ? "밀치기" : "점프"} className={cls}
      onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); onHold?.(true); }}
      onPointerUp={() => onHold?.(false)}
      onPointerCancel={() => onHold?.(false)}
      onLostPointerCapture={() => onHold?.(false)}>
      {label}
    </Button>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-overlay p-4">
      <div className="card-chunky max-h-[85dvh] w-full max-w-lg overflow-y-auto p-5 text-center sm:p-8">{children}</div>
    </div>
  );
}
