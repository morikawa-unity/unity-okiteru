import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PreviousDayReport, PreviousDayReportFormData } from '@/types/report';

/**
 * 前日報告作成用のリクエスト型
 */
interface CreatePreviousDayReportRequest extends PreviousDayReportFormData {
  appearancePhotoUrl: string;
  routePhotoUrl: string;
}

/**
 * 前日報告を作成
 */
export const usePreviousDayReportCreate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePreviousDayReportRequest) => {
      return api.post<PreviousDayReport>('/api/previous-day-reports', {
        report_date: data.reportDate,
        next_wake_up_time: data.nextWakeUpTime,
        next_departure_time: data.nextDepartureTime,
        next_arrival_time: data.nextArrivalTime,
        appearance_photo_url: data.appearancePhotoUrl,
        route_photo_url: data.routePhotoUrl,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      // 前日報告一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['previous-day-reports'] });
    },
  });
};

/**
 * 前日報告一覧を取得
 */
export const usePreviousDayReports = (limit = 10, offset = 0) => {
  return useQuery({
    queryKey: ['previous-day-reports', limit, offset],
    queryFn: async () => {
      return api.get<PreviousDayReport[]>(
        `/api/previous-day-reports?limit=${limit}&offset=${offset}`
      );
    },
  });
};

/**
 * 最新の前日報告を取得
 */
export const useLatestPreviousDayReport = () => {
  return useQuery({
    queryKey: ['previous-day-reports', 'latest'],
    queryFn: async () => {
      return api.get<PreviousDayReport | null>('/api/previous-day-reports/latest/me');
    },
  });
};

/**
 * 前日報告を取得（ID指定）
 */
export const usePreviousDayReport = (reportId: string) => {
  return useQuery({
    queryKey: ['previous-day-reports', reportId],
    queryFn: async () => {
      return api.get<PreviousDayReport>(`/api/previous-day-reports/${reportId}`);
    },
    enabled: !!reportId,
  });
};

/**
 * 前日報告を更新
 */
export const usePreviousDayReportUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      data,
    }: {
      reportId: string;
      data: Partial<CreatePreviousDayReportRequest>;
    }) => {
      return api.put<PreviousDayReport>(`/api/previous-day-reports/${reportId}`, {
        report_date: data.reportDate,
        next_wake_up_time: data.nextWakeUpTime,
        next_departure_time: data.nextDepartureTime,
        next_arrival_time: data.nextArrivalTime,
        appearance_photo_url: data.appearancePhotoUrl,
        route_photo_url: data.routePhotoUrl,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['previous-day-reports'] });
    },
  });
};

/**
 * 前日報告を削除
 */
export const usePreviousDayReportDelete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      return api.delete(`/api/previous-day-reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['previous-day-reports'] });
    },
  });
};
