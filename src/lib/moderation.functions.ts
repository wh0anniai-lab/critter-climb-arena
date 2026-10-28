import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

export const creatorStatus = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (error) throw new Error('제작자 권한을 확인하지 못했어요.');
  return { isCreator: data === true };
});

export const deleteRaceRecord = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { data: allowed, error: roleError } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (roleError || !allowed) throw new Error('제작자만 기록을 지울 수 있어요.');
    const { data: removed, error } = await context.supabase.from('records').delete().eq('id', data.id).select('id');
    if (error || !removed?.length) throw new Error('기록을 지우지 못했어요.');
    return { deleted: true };
  });

export const warnNickname = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ name: z.string().trim().min(1).max(10).refine(name => name !== '익명') }))
  .handler(async ({ context, data }) => {
    const { data: warnings, error } = await context.supabase.rpc('warn_nickname', { _name: data.name });
    if (error) throw new Error('제작자만 이름 경고를 줄 수 있어요.');
    return { warnings };
  });