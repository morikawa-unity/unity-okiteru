import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query クライアント設定
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5分間キャッシュ
    },
    mutations: {
      retry: false,
    },
  },
});
