import { useQuery } from '@apollo/client';
import { GET_REPORTS, GET_REPORT_BY_ID } from '@/graphql/queries';

interface UseReportsOptions {
  status?: string;
  limit?: number;
  offset?: number;
}

export function useReports(options: UseReportsOptions = {}) {
  const { status, limit = 10, offset = 0 } = options;

  const { data, loading, error, refetch } = useQuery(GET_REPORTS, {
    variables: { status, limit, offset },
    fetchPolicy: 'cache-and-network',
  });

  return {
    reports: data?.reports?.items ?? [],
    totalCount: data?.reports?.totalCount ?? 0,
    loading,
    error,
    refetch,
  };
}

export function useReport(id: string) {
  const { data, loading, error, refetch } = useQuery(GET_REPORT_BY_ID, {
    variables: { id },
    skip: !id,
  });

  return {
    report: data?.report ?? null,
    loading,
    error,
    refetch,
  };
}
