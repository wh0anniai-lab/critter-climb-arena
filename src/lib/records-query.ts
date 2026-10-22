import { queryOptions } from '@tanstack/react-query';
import { getRecords } from './records.functions';

export const recordsQuery = queryOptions({
  queryKey: ['race-records'],
  queryFn: () => getRecords(),
  staleTime: 0,
  refetchInterval: 5000,
});