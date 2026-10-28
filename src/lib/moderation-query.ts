import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const warningsQuery = queryOptions({
  queryKey: ['nickname-warnings'],
  queryFn: async () => {
    const { data, error } = await supabase.from('nickname_warnings').select('name,warnings');
    if (error) throw new Error('이름 경고를 확인하지 못했어요.');
    return data;
  },
  refetchInterval: 2000,
});