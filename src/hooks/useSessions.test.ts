import { describe, expect, it, vi } from 'vitest';

// The day's classes used to be sifted out of every session the account has
// ever had, in JS, on the dashboard and on every mark. The table grows all
// term while the result never does, so the read is now an indexed one.

const toArray = vi.fn();
const equals = vi.fn(() => ({ toArray }));
const where = vi.fn(() => ({ equals }));
const tableFilter = vi.fn();

vi.mock('../lib/db', () => ({
  db: { sessions: { where, filter: tableFilter } },
}));

const { loadSessionsOnDate } = await import('./useSessions');

function session(id: string, date: string, deletedAt: string | null = null) {
  return { id, course_id: 'c1', user_id: 'u1', scheduled_date: date, slot: 1, status: 'present', notes: null, created_at: '', updated_at: '', deleted_at: deletedAt };
}

describe('loadSessionsOnDate', () => {
  it('reads through the scheduled_date index rather than walking the table', async () => {
    toArray.mockResolvedValue([session('a', '2026-08-29')]);

    await loadSessionsOnDate('2026-08-29');

    expect(where).toHaveBeenCalledWith('scheduled_date');
    expect(equals).toHaveBeenCalledWith('2026-08-29');
    // The whole point: no table-wide scan.
    expect(tableFilter).not.toHaveBeenCalled();
  });

  it('leaves out tombstones, which linger until the next pull prunes them', async () => {
    toArray.mockResolvedValue([
      session('kept', '2026-08-29'),
      session('gone', '2026-08-29', '2026-08-28T00:00:00Z'),
    ]);

    const rows = await loadSessionsOnDate('2026-08-29');

    expect(rows.map((r) => r.id)).toEqual(['kept']);
  });
});
