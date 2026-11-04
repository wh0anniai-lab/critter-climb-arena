import { checkName } from './name-rules';

export type ChatScope = 'public' | 'bug' | 'idea';
export type ChatMessage = { id: string; name: string; body: string; created_at: string };
export type RoomMessage = ChatMessage & { playerId: string };

export function chatBody(raw: string): string | null {
  const body = raw.trim();
  return body.length > 0 && body.length <= 300 ? body : null;
}

export function chatName(raw: string) {
  const checked = checkName(raw, 0);
  return checked.accepted ? checked.name : '익명';
}

export function receiveRoomMessage(raw: unknown, members: readonly { id: string; name: string }[]): RoomMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as { playerId?: unknown; id?: unknown; body?: unknown; created_at?: unknown };
  const member = members.find(p => p.id === value.playerId);
  if (!member || typeof value.id !== 'string' || value.id.length > 80 || typeof value.body !== 'string' || typeof value.created_at !== 'string' || !Number.isFinite(Date.parse(value.created_at))) return null;
  const body = chatBody(value.body);
  return body ? { id: value.id, playerId: member.id, name: chatName(member.name), body, created_at: value.created_at } : null;
}

export function appendChat(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  return messages.some(m => m.id === message.id) ? messages : [...messages, message].slice(-100);
}

export function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}