import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CHARACTERS, MAPS, type CharId, type DiffId, type MapId } from "@/lib/game";
import { CharacterPreview } from "@/components/CharacterPreview";
import cuteImg from "@/assets/map-cute.jpg";
import spookyImg from "@/assets/map-spooky.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "꼭대기 점프 대작전 — 친구와 함께 달리는 점프맵" },
      { name: "description", content: "고양이, 강아지, 햄스터, 외계인과 함께 같은 서버에서 꼭대기까지 누가 제일 빨리 가는지 겨뤄요!" },
      { property: "og:title", content: "꼭대기 점프 대작전" },
      { property: "og:description", content: "같은 서버에서 친구들과 점프맵 꼭대기 레이스!" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [char, setChar] = useState<CharId>("cat");
  const [map, setMap] = useState<MapId>("cute");
  const [code, setCode] = useState("");

  useEffect(() => {
    const n = localStorage.getItem("jump-name");
    const c = localStorage.getItem("jump-char") as CharId | null;
    if (n) setName(n);
    if (c) setChar(c);
  }, []);

  const finalName = name.trim() || "익명";
  const save = () => {
    localStorage.setItem("jump-name", finalName);
    localStorage.setItem("jump-char", char);
  };

  const create = () => {
    save();
    const c = String(Math.floor(1000 + Math.random() * 9000));
    navigate({ to: "/room/$code", params: { code: c }, search: { name: finalName, char, host: true, map, diff: "normal" as DiffId } });
  };
  const join = () => {
    const c = code.trim();
    if (!c) return;
    save();
    navigate({ to: "/room/$code", params: { code: c }, search: { name: finalName, char, host: false, map: "cute", diff: "normal" as DiffId } });
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="animate-floaty text-5xl text-primary drop-shadow-sm md:text-6xl">꼭대기 점프 대작전</h1>
        <p className="mt-2 text-xl text-muted-foreground">같은 서버에서 친구들과 꼭대기까지 누가 제일 빠를까?</p>
      </header>

      <section className="card-chunky mb-6 p-6">
        <h2 className="mb-3 text-2xl">1. 내 이름과 캐릭터</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 10))}
          placeholder="이름 (최대 10자)"
          className="mb-4 w-full rounded-xl border-[3px] bg-card px-4 py-2 text-xl outline-none focus:ring-4 focus:ring-ring/40"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              data-active={char === c.id}
              onClick={() => setChar(c.id)}
              className="pick flex flex-col items-center bg-card py-3"
            >
              <CharacterPreview char={c.id} size={84} />
              <span className="text-xl">{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card-chunky p-6">
          <h2 className="mb-3 text-2xl">2-A. 새 서버 만들기</h2>
          <p className="mb-3 text-muted-foreground">점프맵을 골라 주세요</p>
          <div className="mb-4 grid grid-cols-2 gap-3">
            {MAPS.map((m) => (
              <button
                key={m.id}
                type="button"
                data-active={map === m.id}
                onClick={() => setMap(m.id)}
                className="pick overflow-hidden bg-card text-left"
              >
                <img
                  src={m.id === "cute" ? cuteImg : spookyImg}
                  alt={m.name}
                  width={992}
                  height={672}
                  className="aspect-[3/2] w-full object-cover"
                />
                <div className="p-2">
                  <div className="text-lg font-display">{m.name}</div>
                  <div className="text-sm text-muted-foreground">{m.desc}</div>
                </div>
              </button>
            ))}
          </div>
          <button type="button" onClick={create} className="btn-chunky w-full bg-primary text-2xl text-primary-foreground">
            서버 만들기
          </button>
        </section>

        <section className="card-chunky flex flex-col p-6">
          <h2 className="mb-3 text-2xl">2-B. 친구 서버 들어가기</h2>
          <p className="mb-3 text-muted-foreground">친구에게 받은 서버 이름(번호)을 입력하세요</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\s/g, "").slice(0, 12))}
            onKeyDown={(e) => e.key === "Enter" && join()}
            placeholder="예: 1234"
            className="mb-4 w-full rounded-xl border-[3px] bg-card px-4 py-3 text-center font-display text-4xl tracking-widest outline-none focus:ring-4 focus:ring-ring/40"
          />
          <button type="button" onClick={join} disabled={!code.trim()} className="btn-chunky w-full bg-secondary text-2xl text-secondary-foreground">
            들어가기
          </button>

          <div className="mt-auto pt-6">
            <h3 className="mb-2 text-xl">조작 방법</h3>
            <ul className="space-y-2 text-lg">
              <li><span className="kbd">Space</span> 점프</li>
              <li><span className="kbd">D</span> 앞으로 · <span className="kbd">S</span> 뒤로</li>
              <li><span className="kbd">A</span> 옆 친구 밀치기 (한 판에 10번!)</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
