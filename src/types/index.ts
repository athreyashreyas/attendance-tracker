// 'planned' = a class placed on the calendar but not yet marked; it counts as a
// scheduled class to come, and is excluded from attendance totals until decided.
export type SessionStatus = 'present' | 'absent' | 'cancelled' | 'planned';
export type ScheduleDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
// How many classes a weekday holds, for the days that hold more than one (a
// double lecture, a lab that runs two periods). Days left out hold exactly one.
export type ClassesPerDay = Partial<Record<ScheduleDay, number>>;

/**
 * One timetable, and the date it took over. A class keeps a list of these, so a
 * timetable that changes partway through a term doesn't rewrite the weeks that
 * ran under the old one.
 */
export interface SchedulePeriod {
  /**
   * The first day this timetable applies, 'YYYY-MM-DD'. Null on the opening
   * one, which covers everything up to the first change.
   */
  effective_from: string | null;
  days: ScheduleDay[];
  /** Only the days that meet more than once, exactly as on the course. */
  sessions_per_day: ClassesPerDay;
}

export type TableName = 'semesters' | 'courses' | 'sessions';
export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface Semester {
  id: string;
  user_id: string;
  name: string;
  start_date: string; // 'YYYY-MM-DD'
  end_date: string;
  is_active: boolean;
  archived_at: string | null; // ISO timestamp; null = still live
  auto_archive: boolean; // may the app archive this once it has ended?
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Course {
  id: string;
  user_id: string;
  semester_id: string | null; // null = a standalone class, not tied to a semester
  name: string;
  color: string; // hex color
  // The timetable running now. It mirrors the newest entry of schedule_history
  // so that a build of the app that predates the timeline still reads a class's
  // current days correctly; the timeline is what the app itself reads.
  schedule_days: ScheduleDay[];
  // Only the days that meet more than once appear here, so a class with one
  // lecture a day carries an empty object, exactly as it always did.
  sessions_per_day: ClassesPerDay;
  // The class's timetable over time, oldest first: the opening timetable, then
  // one entry per change. Empty on a class that has never changed its days,
  // which is every class synced before this existed. See lib/schedule.ts.
  schedule_history: SchedulePeriod[];
  min_attendance_pct: number;
  // Where this class sits in the order the user arranged, counting from 0.
  // Null on a class that has never been arranged, which reads as "after the
  // ones that have, in the order it was created". See lib/order.ts.
  position: number | null;
  start_date: string | null; // 'YYYY-MM-DD'; null falls back to the semester
  end_date: string | null;
  // Dates inside the window where this class doesn't meet: holidays, breaks,
  // one-off cancellations known in advance. They're removed from the schedule
  // outright rather than recorded as cancelled sessions.
  excluded_dates: string[]; // 'YYYY-MM-DD'
  archived_at: string | null; // ISO timestamp; null = still live
  auto_archive: boolean; // may the app archive this once its last class has passed?
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Session {
  id: string;
  course_id: string;
  user_id: string;
  scheduled_date: string; // 'YYYY-MM-DD'
  // Which class of that day this is, counting from 1. A day with a single
  // class only ever has slot 1; a double lecture has slots 1 and 2.
  slot: number;
  status: SessionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  operation: SyncOperation;
  old_data: unknown;
  new_data: unknown;
  changed_at: string;
  user_id: string;
}

export interface AttendanceStats {
  courseId: string;
  total: number; // non-cancelled sessions
  present: number;
  absent: number;
  cancelled: number;
  percentage: number; // present / total * 100 (0 if total = 0)
  threshold: number; // min_attendance_pct
  canMissMore: number; // positive = sessions she can still miss; 0 = already at risk
  needToAttend: number; // sessions she must attend consecutively to reach threshold (0 if already above)
  isAtRisk: boolean; // percentage < threshold
}

export interface TermProjection {
  courseId: string;
  remaining: number; // future planned classes still to come this term
  projectedTotal: number; // present + absent + remaining (cancelled excluded)
  mustAttend: number; // of the remaining, how many must be attended to hit threshold
  canSkip: number; // of the remaining, how many can still be missed (0 if unreachable)
  reachable: boolean; // can the threshold still be reached by attending all remaining?
  bestPct: number; // final % if every remaining class is attended
  worstPct: number; // final % if no remaining class is attended
}

export interface SyncQueueItem {
  id?: number;
  table_name: TableName;
  operation: SyncOperation;
  record_id: string;
  payload: string; // JSON.stringify of the row
  created_at: string;
  retry_count: number;
}

/**
 * A message written in Settings that has not reached the creator yet. It
 * waits on the device, exactly like an unsent change waits in the sync queue, and
 * goes out on its own once there is a connection again.
 */
export interface FeedbackOutboxItem {
  id?: number;
  kind: 'bug' | 'idea';
  subject: string;
  body: string;
  created_at: string;
  /** Failed attempts so far, so a message that cannot land is given up on. */
  attempts: number;
}

// Dexie local types (same as above, with extra sync fields)
export interface LocalRecord {
  synced_at: string | null;
  _local_only?: boolean; // true if created offline, not yet in Supabase
}

export type LocalSemester = Semester & LocalRecord;
export type LocalCourse = Course & LocalRecord;
export type LocalSession = Session & LocalRecord;

// Maps a table name to its remote row type
export interface RowByTable {
  semesters: Semester;
  courses: Course;
  sessions: Session;
}
