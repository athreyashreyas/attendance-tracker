import { describe, expect, it } from 'vitest';
import { toRemote } from './records';
import { makeCourse, makeSession } from '../lib/test-factories';
import type { LocalCourse, LocalSession } from '../types';

/**
 * Dexie rows carry two fields the server has never heard of: `synced_at`, which
 * is this device's bookkeeping, and `_local_only`, which marks a row created
 * offline. Sending either one up is a Postgres error on a column that does not
 * exist, and it happens on the sync path, where the failure surfaces as "could
 * not sync" long after the row was written.
 */
describe('toRemote', () => {
  const local = (over: Partial<LocalCourse> = {}): LocalCourse => ({
    ...makeCourse(),
    synced_at: '2026-01-01T00:00:00.000Z',
    _local_only: false,
    ...over,
  });

  it('strips the two Dexie-only fields', () => {
    const row = toRemote(local());
    expect('synced_at' in row).toBe(false);
    expect('_local_only' in row).toBe(false);
  });

  it('keeps everything the server does know about', () => {
    const course = local({ name: 'Victorian Literature', min_attendance_pct: 80 });
    const row = toRemote(course);
    expect(row).toMatchObject({
      id: course.id,
      user_id: course.user_id,
      name: 'Victorian Literature',
      min_attendance_pct: 80,
      schedule_days: course.schedule_days,
    });
  });

  it('keeps a null the server expects, rather than stripping it as absent', () => {
    // deleted_at: null is a real value — a tombstone that has not been set —
    // and dropping it would leave an update that never clears one.
    const row = toRemote(local({ deleted_at: null, semester_id: null }));
    expect(row.deleted_at).toBeNull();
    expect(row.semester_id).toBeNull();
    expect('deleted_at' in row).toBe(true);
  });

  it('strips a row that never synced, where the fields hold their empty values', () => {
    const row = toRemote(local({ synced_at: null, _local_only: true }));
    expect('synced_at' in row).toBe(false);
    expect('_local_only' in row).toBe(false);
  });

  it('copes with a row where _local_only was never written at all', () => {
    const { _local_only: _dropped, ...withoutFlag } = local();
    const row = toRemote(withoutFlag as LocalCourse);
    expect('_local_only' in row).toBe(false);
    expect('synced_at' in row).toBe(false);
  });

  it('leaves the original row untouched, since Dexie still holds it', () => {
    const course = local();
    toRemote(course);
    expect(course.synced_at).toBe('2026-01-01T00:00:00.000Z');
    expect(course._local_only).toBe(false);
  });

  it('works the same on a session as on a course', () => {
    const session: LocalSession = {
      ...makeSession('course-1', '2026-09-07', 'present'),
      synced_at: null,
      _local_only: true,
    };
    const row = toRemote(session);
    expect('synced_at' in row).toBe(false);
    expect('_local_only' in row).toBe(false);
    expect(row).toMatchObject({ scheduled_date: '2026-09-07', status: 'present' });
  });

  it('survives a JSON round-trip, which is what the client actually sends', () => {
    const row = toRemote(local());
    expect(JSON.parse(JSON.stringify(row))).toEqual(row);
    expect(JSON.stringify(row)).not.toContain('synced_at');
    expect(JSON.stringify(row)).not.toContain('_local_only');
  });
});
