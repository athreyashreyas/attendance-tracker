import type {
  Course,
  ScheduleDay,
  Semester,
  Session,
  SessionStatus,
} from '../types';

/**
 * Builders for the tests: a plain, valid record with everything set, so each
 * test can name only the field it's actually about. Anything a test doesn't
 * mention should be uninteresting to it.
 */

let counter = 0;
const nextId = () => `id-${(counter += 1)}`;

export function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: nextId(),
    user_id: 'user-1',
    semester_id: null,
    name: 'Victorian Literature',
    color: '#4F7942',
    schedule_days: [1, 3] as ScheduleDay[], // Monday and Wednesday
    sessions_per_day: {},
    // Empty: a class whose timetable has never changed, which is how every
    // class starts and how every class saved before timelines existed reads.
    schedule_history: [],
    min_attendance_pct: 75,
    start_date: null,
    end_date: null,
    excluded_dates: [],
    archived_at: null,
    auto_archive: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

export function makeSemester(overrides: Partial<Semester> = {}): Semester {
  return {
    id: nextId(),
    user_id: 'user-1',
    name: 'Autumn 2026',
    start_date: '2026-09-01',
    end_date: '2026-12-18',
    is_active: true,
    archived_at: null,
    auto_archive: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

export function makeSession(
  courseId: string,
  scheduledDate: string,
  status: SessionStatus,
  overrides: Partial<Session> = {}
): Session {
  return {
    id: nextId(),
    course_id: courseId,
    user_id: 'user-1',
    scheduled_date: scheduledDate,
    slot: 1,
    status,
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

/** A run of sessions on consecutive class dates, for percentage arithmetic. */
export function makeSessions(
  courseId: string,
  entries: [date: string, status: SessionStatus, slot?: number][]
): Session[] {
  return entries.map(([date, status, slot]) =>
    makeSession(courseId, date, status, slot ? { slot } : {})
  );
}
