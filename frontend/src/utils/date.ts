import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * 日付を指定フォーマットで整形
 */
export function formatDate(date: string | Date, formatStr: string = 'yyyy/MM/dd'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: ja });
}

/**
 * 日時を指定フォーマットで整形
 */
export function formatDateTime(
  date: string | Date,
  formatStr: string = 'yyyy/MM/dd HH:mm'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: ja });
}

/**
 * 時刻のみを整形
 */
export function formatTime(date: string | Date, formatStr: string = 'HH:mm'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: ja });
}

/**
 * 現在の日付を取得（YYYY-MM-DD形式）
 */
export function getCurrentDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * 現在の日時を取得（ISO 8601形式）
 */
export function getCurrentDateTime(): string {
  return new Date().toISOString();
}
