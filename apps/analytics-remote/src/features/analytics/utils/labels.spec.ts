import { formatDateTime, formatDuration, formatShortDate, teamLabels } from './labels';

describe('analytics labels utils', () => {
  it('formats durations for minutes and hours', () => {
    expect(formatDuration(0)).toBe('меньше минуты');
    expect(formatDuration(17)).toBe('17 мин');
    expect(formatDuration(60)).toBe('1 ч');
    expect(formatDuration(135)).toBe('2 ч 15 мин');
  });

  it('keeps invalid dates as-is and maps team labels', () => {
    expect(formatDateTime('invalid-date')).toBe('invalid-date');
    expect(formatShortDate('invalid-date')).toBe('invalid-date');
    expect(teamLabels.requesters).toBe('Сотрудник');
  });
});
