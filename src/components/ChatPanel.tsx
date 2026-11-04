import { useEffect, useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bug, Lightbulb, MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { chatBody, chatName, type ChatMessage, type ChatScope } from '@/lib/chat';

export function ChatConversation({ messages, ready, error, onSend, onFocus }: {
  messages: ChatMessage[]; ready: boolean; error?: string; onSend: (body: string) => Promise<void>; onFocus?: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const inputId = useId();
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }); }, [messages]);
  return <div className="min-h-0">
    <div role="log" aria-label="채팅 메시지" aria-live="polite" className="h-36 overflow-y-auto overscroll-contain rounded-lg bg-muted/50 px-3 py-2 text-base sm:h-44">
      {!ready ? <p className="text-muted-foreground">채팅 연결 중…</p> : messages.length === 0 ? <p className="text-muted-foreground">아직 메시지가 없어요.</p> : messages.map(message => <div key={message.id} className="mb-2 break-words"><div className="flex items-baseline gap-2"><span className="font-display text-primary">{message.name}</span><time className="text-xs text-muted-foreground">{new Date(message.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}</time></div><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.body}</p></div>)}
      <div ref={bottom} />
    </div>
    <form className="mt-3 flex items-center gap-2" onSubmit={async event => {
      event.preventDefault();
      const body = chatBody(draft);
      if (!body || sending || !ready) return;
      setSending(true); setSendError('');
      try { await onSend(body); setDraft(''); } catch { setSendError('전송하지 못했어요. 다시 시도해 주세요.'); } finally { setSending(false); }
    }}>
      <label htmlFor={inputId} className="sr-only">채팅 메시지 입력</label>
      <input id={inputId} value={draft} onChange={event => setDraft(event.target.value)} onFocus={onFocus} maxLength={300} placeholder="메시지 입력…" autoComplete="off" className="h-11 min-w-0 flex-1 rounded-lg border bg-card px-3 text-base focus-visible:ring-2 focus-visible:ring-ring" />
      <Button type="submit" size="icon" className="h-11 w-11 shrink-0" aria-label="메시지 보내기" title="메시지 보내기" disabled={!ready || !chatBody(draft) || sending}><Send /></Button>
    </form>
    {(error || sendError) && <p role="alert" className="mt-2 text-sm text-destructive">{error || sendError}</p>}
  </div>;
}

export function CommunityChat({ name }: { name: string }) {
  const [scope, setScope] = useState<ChatScope>('public');
  const client = useQueryClient();
  const queryKey = ['community-chat', scope];
  const { data: messages = [], isPending, isError } = useQuery({ queryKey, queryFn: async () => {
    const { data, error } = await supabase.from('community_messages').select('*').eq('channel', scope).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data.reverse();
  }, refetchInterval: 5000 });
  useEffect(() => {
    const channel = supabase.channel(`community-chat-${scope}-${Math.random().toString(36).slice(2)}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `channel=eq.${scope}` }, () => { void client.invalidateQueries({ queryKey: ['community-chat', scope] }); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [scope, client]);
  return <section className="mt-7 border-t-2 border-border/20 pt-6" aria-labelledby="community-heading">
    <h2 id="community-heading" className="mb-3 flex items-center gap-2 text-2xl"><MessageCircle />친구들과 채팅 · 공개 건의</h2>
    <div className="mb-3 flex flex-wrap gap-2">{([{ id: 'public', label: '공용 채팅', Icon: MessageCircle }, { id: 'bug', label: '오류 건의', Icon: Bug }, { id: 'idea', label: '새 기능 건의', Icon: Lightbulb }] as const).map(({ id, label, Icon }) => <Button key={id} variant={scope === id ? 'secondary' : 'outline'} aria-pressed={scope === id} onClick={() => setScope(id)}><Icon />{label}</Button>)}</div>
    <ChatConversation key={scope} messages={messages} ready={!isPending && !isError} error={isError ? '채팅을 불러오지 못했어요.' : ''} onSend={async body => {
      const { error } = await supabase.from('community_messages').insert({ channel: scope, name: chatName(name), body });
      if (error) throw error;
      await client.invalidateQueries({ queryKey });
    }} />
  </section>;
}

export function RoomChat({ messages, ready, onSend, onFocus }: { messages: ChatMessage[]; ready: boolean; onSend: (body: string) => Promise<void>; onFocus: () => void }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  useEffect(() => { if (open) setSeen(messages.length); }, [open, messages.length]);
  return <div className="absolute bottom-32 left-3 z-20 max-w-[calc(100%-1.5rem)] touch-auto">
    {open && <section aria-label="서버 채팅" className="mb-2 w-80 max-w-full rounded-lg border-2 bg-card p-3 text-card-foreground shadow-md">
      <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg">서버 채팅</h2><Button size="icon" variant="ghost" aria-label="채팅 닫기" onClick={() => setOpen(false)}><X /></Button></div>
      <ChatConversation messages={messages} ready={ready} onSend={onSend} onFocus={onFocus} />
    </section>}
    <Button variant="secondary" onClick={() => { setOpen(value => !value); onFocus(); }} aria-expanded={open}><MessageCircle />서버 채팅{!open && messages.length > seen ? ` (${messages.length - seen})` : ''}</Button>
  </div>;
}