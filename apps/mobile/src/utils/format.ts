import dayjs from 'dayjs';
import 'dayjs/locale/es';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('es');

export function formatCurrency(
  amount: number,
  currency = 'COP',
  compact = false,
): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    const value = amount / 1_000_000;
    return `${currency === 'COP' ? '$' : ''}${value.toFixed(1)}M`;
  }
  if (compact && Math.abs(amount) >= 1_000) {
    const value = amount / 1_000;
    return `${currency === 'COP' ? '$' : ''}${value.toFixed(0)}K`;
  }

  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return formatted;
}

export function formatPercentage(value: number, decimals = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatDate(date: string, format = 'D MMM YYYY'): string {
  return dayjs(date).format(format);
}

export function formatRelativeDate(date: string): string {
  return dayjs(date).fromNow();
}

export function formatMonth(year: number, month: number): string {
  return dayjs(`${year}-${month}-01`).format('MMMM YYYY');
}

export function getChangeColor(value: number): string {
  if (value > 0) return '#10B981';
  if (value < 0) return '#EF4444';
  return '#9CA3AF';
}

export function getChangeIcon(value: number): string {
  if (value > 0) return 'trending-up';
  if (value < 0) return 'trending-down';
  return 'minus';
}
