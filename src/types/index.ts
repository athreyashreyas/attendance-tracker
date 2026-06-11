export type SessionStatus = 'present' | 'absent' | 'cancelled';
export type ScheduleDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
export type TableName = 'semesters' | 'courses' | 'sessions';
export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface Semester {
  id: string;
  user_id: string;
  name: string;
  start_date: string; // 'YYYY-MM-DD'
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Course {
  id: string;
  user_id: string;
  semester_id: string;
  name: string;
  color: string; // hex color
  schedule_days: ScheduleDay[];
  min_attendance_pct: number;
  start_date: string | null; // 'YYYY-MM-DD'; null falls back to the semester
  end_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Session {
  id: string;
  course_id: string;
  user_id: string;
  scheduled_date: string; // 'YYYY-MM-DD'
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
