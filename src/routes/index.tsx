import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { LogIn, Plus, Trophy, RefreshCw } from "lucide-react";
import { CHARACTERS, MAPS, DIFFICULTIES, formatTime, type CharId, type DiffId, type MapId } from "@/lib/game";
import { CharacterPreview } from "@/components/CharacterPreview";
import { Button } from "@/components/ui/button";
import { MAP_IMAGES } from "@/lib/map-images";
import { checkName } from "@/lib/name-rules";
import { recordsQuery } from "@/lib/records-query";
import { rankByMode, moderatedName } from '@/lib/leaderboard';
import { warningsQuery } from '@/lib/moderation-query';
import { supabase } from '@/integrations/supabase/client';
import { CreatorControls, DeleteRecordButton, useCreator } from '@/components/CreatorControls';

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(recordsQuery),
  errorComponent: ({ reset }) => <main className="mx-auto max-w-lg p-8 text-center"><h1 className="text-3xl">기록을 불러오지 못했어요</h1><Button className="mt-4" onClick={() => { window.location.reload(); reset(); }}>다시 시도</Button></main>,
  notFoundComponent: () => <p>점프맵 화면을 찾을 수 없어요.</p>,
  head: () => ({ meta: [
    { title: "점프맵 — 친구들과 꼭대기 레이스" },
    { name: "description", content: "귀여운 동물 친구들과 점프맵! 배경과 난이도를 고르고 같은 서버에서 경쟁하며 친구들의 기록을 확인해요." },
    { property: "og:title", content: "점프맵 — 친구들과 꼭대기 레이스" },
    { property: "og:description", content: "젤리 나라부터 바닷속까지, 같은 서버에서 함께 점프하고 기록을 겨뤄요." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { data: records, refetch, isFetching } = useSuspenseQuery(recordsQuery);
  const [name, setName] = useState("");
  const [char, setChar] = useState<CharId>("cat");
  const [map, setMap] = useState<MapId>("cute");
  const [diff, setDiff] = useState<DiffId>("easy");
  const [code, setCode] = useState("");
  const [warnings, setWarnings] = useState(0);
  const [warning, setWarning] = useState("");
  const [recordView, setRecordView] = useState<'best' | 'recent'>('best');
  const [rankMode, setRankMode] = useState<DiffId>('easy');
  const { isCreator } = useCreator();
  const { data: globalWarnings } = useQuery(warningsQuery);

  useEffect(() => {
    const count = globalWarnings?.find(entry => entry.name === name.trim())?.warnings ?? 0;
    if (count > 0) setWarning(count >= 3 ? '제작자 경고 3번! 이름이 익명으로 고정되었어요.' : `제작자 이름 경고 ${count}/3`);
    if (count >= 3) {
      setWarnings(3);
      setName('익명');
      localStorage.setItem('jump-warnings', '3');
      localStorage.setItem('jump-name', '익명');
    }
  }, [globalWarnings, name]);

  useEffect(() => {
    const count = Math.min(3, Math.max(0, Number(localStorage.getItem('jump-warnings')) || 0));
    setWarnings(count);
    setName(count >= 3 ? '익명' : localStorage.getItem('jump-name') || '');
    const saved = localStorage.getItem('jump-char');
    if (CHARACTERS.some(c => c.id === saved)) setChar(saved as CharId);
  }, []);

  const enter = async (host: boolean) => {
    if (!host && !code.trim()) return;
    const { data: global, error } = await supabase.from('nickname_warnings').select('warnings').eq('name', name.trim()).maybeSingle();
    if (error) { setWarning('이름 경고를 확인하지 못했어요. 다시 시도해 주세요.'); return; }
    const count = global?.warnings ?? 0;
    const result = checkName(moderatedName(name, count), Math.max(warnings, count >= 3 ? 3 : 0));
    setWarnings(result.warnings);
    localStorage.setItem('jump-warnings', String(result.warnings));
    if (!result.accepted) {
      setWarning(result.warnings >= 3 ? '경고 3번! 이름이 익명으로 고정되었어요.' : `바른 이름을 사용해 주세요. 경고 ${result.warnings}/3`);
      if (result.warnings >= 3) setName('익명');
      return;
    }
    localStorage.setItem('jump-name', result.name);
    localStorage.setItem('jump-char', char);
    void navigate({ to: '/room/$code', params: { code: host ? String(Math.floor(1000 + Math.random() * 9000)) : code.trim() }, search: { name: result.name, char, host, map, diff } });
  };
  const ranked = rankByMode(records, rankMode, recordView);
  const modeName = (id: string) => id === 'easy' ? '이지모드' : id === 'hard' ? '어려운 모드' : '보통모드';

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
      <header className="mb-7 flex items-center justify-between gap-4 border-b-2 border-border/20 pb-5">
        <div><h1 className="text-5xl text-primary sm:text-6xl">점프맵</h1><p className="mt-1 text-lg text-muted-foreground">친구들과 함께, 꼭대기까지! 🏁</p></div>
        <div className="hidden sm:block"><CharacterPreview char="capybara" size={90} /></div>
      </header>

      <section className="mb-7 border-b-2 border-border/20 pb-7">
        <h2 className="mb-3 text-2xl">내 이름과 동물 친구</h2>
        <label className="mb-1 block" htmlFor="player-name">이름</label>
        <input id="player-name" value={name} disabled={warnings >= 3} onChange={e => setName(e.target.value.slice(0, 10))} placeholder="이름 (최대 10자)" className="mb-3 w-full max-w-md rounded-lg border-2 bg-card px-4 py-2 text-xl focus:ring-4 focus:ring-ring/40" />
        {warning && <p role="alert" className="mb-3 text-destructive">{warning}</p>}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 sm:gap-3">
          {CHARACTERS.map(c => <Button variant="outline" key={c.id} aria-pressed={char === c.id} data-active={char === c.id} onClick={() => setChar(c.id)} className="pick h-auto min-w-0 flex-col gap-0 px-1 py-2"><CharacterPreview char={c.id} size={64} /><span className="text-base sm:text-lg">{c.name}</span></Button>)}
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-2xl"><Plus />새 서버 만들기</h2>
          <fieldset className="mb-5"><legend className="mb-2 text-xl font-display">모드</legend><div className="grid grid-cols-3 gap-2">{DIFFICULTIES.map(d => <Button key={d.id} variant="outline" aria-pressed={diff === d.id} data-active={diff === d.id} onClick={() => setDiff(d.id)} className="pick h-auto min-w-0 flex-col whitespace-normal px-1 py-3"><span className="text-base sm:text-lg">{modeName(d.id)}</span><span className="text-sm font-sans">{d.desc}</span></Button>)}</div></fieldset>
          <fieldset><legend className="mb-2 text-xl font-display">서버 배경</legend><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{MAPS.map(m => <Button key={m.id} variant="outline" aria-pressed={map === m.id} data-active={map === m.id} onClick={() => setMap(m.id)} className="pick h-auto min-w-0 flex-col gap-0 overflow-hidden p-0"><img src={MAP_IMAGES[m.id]} alt={m.name} loading="lazy" width={1024} height={688} className="aspect-[3/2] w-full object-cover" /><span className="w-full whitespace-normal px-1 py-2 text-base">{m.name}</span></Button>)}</div></fieldset>
          <Button onClick={() => enter(true)} className="btn-chunky mt-5 h-auto w-full text-xl"><Plus />서버 만들기</Button>
        </section>

        <div className="space-y-7">
          <section className="border-b-2 border-border/20 pb-6"><h2 className="mb-3 flex items-center gap-2 text-2xl"><LogIn />친구 서버 들어가기</h2><label htmlFor="room-code" className="mb-2 block">서버 번호</label><input id="room-code" value={code} onChange={e => setCode(e.target.value.replace(/\s/g, '').slice(0, 12))} onKeyDown={e => e.key === 'Enter' && enter(false)} placeholder="예: 1234" className="mb-3 w-full rounded-lg border-2 bg-card px-3 py-2 text-center font-display text-3xl" /><Button variant="secondary" disabled={!code.trim()} onClick={() => enter(false)} className="btn-chunky h-auto w-full text-xl"><LogIn />들어가기</Button></section>
          <section><h2 className="mb-3 text-2xl">📜 게임 규칙</h2><ul className="space-y-2 text-lg"><li>🏁 꼭대기에 가장 빨리 도착하면 승리!</li><li>👑 방장이 시작을 누르면 모두 함께 출발해요.</li><li>🌱 떨어져도 탈락하지 않아요. 다시 올라가요!</li><li>👊 옆 친구 밀치기는 한 판에 10번이에요.</li><li>💬 나쁜 이름은 경고! 3번이면 익명으로 고정돼요.</li><li>👆 화면의 ◀ ▶ 버튼으로 이동, ⤒로 점프해요.</li><li className="text-base text-muted-foreground">키보드: Space 점프 · S 왼쪽 · D 오른쪽 · A 밀치기</li></ul></section>
        </div>
      </div>

      <section className="mt-9 border-t-2 border-border/20 pt-6">
        <div className="mb-4"><CreatorControls /></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-2xl"><Trophy className="text-primary" />다른 사람의 기록 · 랭킹</h2><Button variant="outline" size="icon" aria-label="기록 새로고침" title="기록 새로고침" disabled={isFetching} onClick={() => void refetch()}><RefreshCw /></Button></div>
        <div className="mt-3 flex flex-wrap gap-2">{DIFFICULTIES.map(mode => <Button key={mode.id} variant={rankMode === mode.id ? 'secondary' : 'outline'} aria-pressed={rankMode === mode.id} onClick={() => setRankMode(mode.id)}>{modeName(mode.id)}</Button>)}</div>
        <div className="my-3 flex gap-2"><Button variant={recordView === 'best' ? 'secondary' : 'outline'} aria-pressed={recordView === 'best'} onClick={() => setRecordView('best')}>최고 기록</Button><Button variant={recordView === 'recent' ? 'secondary' : 'outline'} aria-pressed={recordView === 'recent'} onClick={() => setRecordView('recent')}>최근 기록</Button></div>
        {ranked.length === 0 ? <p className="border-y border-border/20 py-6 text-center text-muted-foreground">아직 이 모드의 완주 기록이 없어요.</p> : <ol className="divide-y divide-border/20">{ranked.slice(0, 20).map((r, i) => <li key={r.id} className="flex items-center gap-3 py-3"><span className="w-9 text-center font-display text-xl">{recordView === 'best' ? ['🥇', '🥈', '🥉'][i] ?? i + 1 : '🏁'}</span><span className="min-w-0 flex-1 truncate text-xl">{r.name}</span><span className="hidden text-muted-foreground sm:block">{new Date(r.created_at).toISOString().slice(0, 10)}</span><span className="font-display text-xl text-primary">{formatTime(r.time_ms)}</span>{isCreator && <DeleteRecordButton id={r.id} />}</li>)}</ol>}
        <h3 className="mt-5 text-lg">전체 배경의 최근 완주</h3>
        {records.length === 0 ? <p className="py-3 text-muted-foreground">첫 번째 완주 기록을 기다리고 있어요!</p> : <ul className="divide-y divide-border/20">{records.slice(0, 8).map(r => <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"><span className="min-w-0 truncate font-display">{r.name}</span><span className="text-sm text-muted-foreground">{modeName(r.diff)}</span><span className="ml-auto font-display text-primary">{formatTime(r.time_ms)}</span>{isCreator && <DeleteRecordButton id={r.id} />}</li>)}</ul>}
      </section>
    </main>
  );
}
