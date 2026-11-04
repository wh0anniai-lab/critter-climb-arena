import { describe, expect, it } from 'vitest';
import { receiveRoomMessage, chatBody, isTypingTarget } from '../lib/chat';

describe('room chat membership', () => {
  const message = { id: 'msg1', playerId: 'friend', body: '안녕!', created_at: '2026-11-04T06:00:00Z' };
  it('accepts chat from players in the same server', () => {
    expect(receiveRoomMessage(message, [{ id: 'friend', name: '친구' }])?.body).toBe('안녕!');
  });
  it('rejects chat from a player outside the server', () => {
    expect(receiveRoomMessage(message, [{ id: 'other', name: '다른방' }])).toBeNull();
  });
  it('rejects chat from a player who left', () => {
    expect(receiveRoomMessage(message, [])).toBeNull();
  });
});
it('allows nonempty messages up to 300 characters', () => {
  expect(chatBody(' ')).toBeNull();
  expect(chatBody('가'.repeat(300))).toHaveLength(300);
  expect(chatBody('가'.repeat(301))).toBeNull();
});
it('keeps game keys out of chat inputs', () => {
  expect(isTypingTarget(document.createElement('input'))).toBe(true);
  expect(isTypingTarget(document.createElement('canvas'))).toBe(false);
});