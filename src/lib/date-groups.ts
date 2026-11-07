/**
 * Visual grouping utility for organizing memories by relative recency:
 * 'Today' | 'This Week' | 'Older'
 */

export type DateGroupLabel = 'Today' | 'This Week' | 'Older';

export interface DateGroup<T> {
  label: DateGroupLabel;
  description: string;
  items: T[];
}

export function getDateGroupLabel(dateInput: string | number | Date | undefined): DateGroupLabel {
  if (!dateInput) return 'Older';
  
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Older';

  const now = new Date();
  
  // Start of today (midnight)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // If occurred today (after midnight today)
  if (d.getTime() >= startOfToday.getTime()) {
    return 'Today';
  }

  // Start of this week (7 days ago midnight)
  const sevenDaysAgo = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);
  if (d.getTime() >= sevenDaysAgo.getTime()) {
    return 'This Week';
  }

  return 'Older';
}

export function groupMemoriesByDate<T>(
  items: T[],
  getDate: (item: T) => string | number | Date | undefined
): DateGroup<T>[] {
  const groups: Record<DateGroupLabel, T[]> = {
    'Today': [],
    'This Week': [],
    'Older': [],
  };

  for (const item of items) {
    const label = getDateGroupLabel(getDate(item));
    groups[label].push(item);
  }

  const result: DateGroup<T>[] = [];

  if (groups['Today'].length > 0) {
    result.push({
      label: 'Today',
      description: 'Captured in the last 24 hours',
      items: groups['Today'],
    });
  }

  if (groups['This Week'].length > 0) {
    result.push({
      label: 'This Week',
      description: 'Captured over the past 7 days',
      items: groups['This Week'],
    });
  }

  if (groups['Older'].length > 0) {
    result.push({
      label: 'Older',
      description: 'Earlier archived moments',
      items: groups['Older'],
    });
  }

  return result;
}
