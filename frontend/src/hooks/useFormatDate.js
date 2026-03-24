import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useFormatDate() {
  const { timezone } = useAuth();

  return useMemo(() => {
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: timezone,
    });

    const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    });

    const formatDate = (dateStr) => {
      if (!dateStr) return '--';
      try {
        return dateFormatter.format(new Date(dateStr));
      } catch {
        return String(dateStr);
      }
    };

    const formatDateTime = (dateStr) => {
      if (!dateStr) return '--';
      try {
        return dateTimeFormatter.format(new Date(dateStr));
      } catch {
        return String(dateStr);
      }
    };

    return { formatDate, formatDateTime };
  }, [timezone]);
}
