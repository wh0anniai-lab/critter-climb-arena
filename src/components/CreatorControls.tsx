import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { lovable } from '@/integrations/lovable/index';
import '@lovable.dev/cloud-auth-js/styles.css';
import { supabase } from '@/integrations/supabase/client';
import { creatorStatus, deleteRaceRecord, warnNickname } from '@/lib/moderation.functions';
import { Button } from '@/components/ui/button';

export function useCreator() {
  const session = useQuery({ queryKey: ['creator-session'], queryFn: async () => (await supabase.auth.getSession()).data.session });
  const check = useServerFn(creatorStatus);
  const role = useQuery({ queryKey: ['creator-role', session.data?.user.id], queryFn: () => check(), enabled: !!session.data, retry: false });
  return { session: session.data, isCreator: role.data?.isCreator === true, loading: session.isPending || (!!session.data && role.isPending), error: role.error };
}

export function CreatorControls() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const { session, isCreator, loading, error } = useCreator();
  const warn = useServerFn(warnNickname);
  const client = useQueryClient();
  async function login(provider: 'google' | 'lovable') {
    setBusy(true);
    setMessage('');
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (result.error) setMessage('로그인하지 못했어요. 다시 시도해 주세요.');
      if (!result.redirected) await client.invalidateQueries({ queryKey: ['creator-session'] });
    } catch { setMessage('로그인하지 못했어요. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  }
  async function issueWarning() {
    if (!target.trim() || !window.confirm(`‘${target.trim()}’ 이름에 모든 서버에서 적용되는 경고를 줄까요? 같은 이름을 쓰는 모두에게 적용돼요.`)) return;
    setBusy(true);
    try {
      const result = await warn({ data: { name: target.trim() } });
      setMessage(`${target.trim()} · 경고 ${result.warnings}/3${result.warnings >= 3 ? ' · 익명으로 고정' : ''}`);
      await client.invalidateQueries({ queryKey: ['nickname-warnings'] });
    } catch { setMessage('경고를 주지 못했어요. 제작자 권한을 확인해 주세요.'); }
    finally { setBusy(false); }
  }
  return <div>
    <Button variant="outline" onClick={() => setOpen(value => !value)} aria-expanded={open}><ShieldCheck />제작자 확인</Button>
    {open && <div className="mt-3 space-y-3 border-y border-border/20 py-4">
      {!session ? <div className="flex flex-wrap gap-2"><Button disabled={busy} variant="outline" onClick={() => void login('google')}>Google로 로그인</Button><Button disabled={busy} className="lovable-auth-button" onClick={() => void login('lovable')}>Sign in with Lovable</Button></div>
        : <><p>{loading ? '제작자 확인 중…' : error ? '제작자 권한을 확인하지 못했어요.' : isCreator ? '제작자 확인 완료' : '제작자 권한이 없는 계정이에요.'}</p>
          {isCreator && <div className="flex flex-wrap items-end gap-2"><label className="flex-1">경고할 이름<input value={target} onChange={e => setTarget(e.target.value.slice(0, 10))} maxLength={10} className="mt-1 block w-full rounded-lg border-2 bg-card px-3 py-2" /></label><Button disabled={busy || !target.trim() || target.trim() === '익명'} variant="destructive" onClick={() => void issueWarning()}>이름 경고</Button></div>}
          <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); client.removeQueries({ queryKey: ['creator-role'] }); await client.invalidateQueries({ queryKey: ['creator-session'] }); }}>로그아웃</Button></>}
      {message && <p role="status">{message}</p>}
    </div>}
  </div>;
}

export function DeleteRecordButton({ id }: { id: string }) {
  const remove = useServerFn(deleteRaceRecord);
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  return <Button size="icon" variant="outline" disabled={busy} title="기록 삭제" aria-label="기록 삭제" onClick={async () => {
    if (!window.confirm('이 완주 기록을 지울까요? 되돌릴 수 없어요.')) return;
    setBusy(true);
    try { await remove({ data: { id } }); await client.invalidateQueries({ queryKey: ['race-records'] }); }
    catch { window.alert('기록을 지우지 못했어요. 제작자 권한을 확인해 주세요.'); }
    finally { setBusy(false); }
  }}><Trash2 /></Button>;
}