import Dexie, { type EntityTable } from 'dexie';
import type {
  LocalSemester,
  LocalCourse,
  LocalSession,
  SyncQueueItem,
} from '../types';

class AttendDB extends Dexie {
  semesters!: EntityTable<LocalSemester, 'id'>;
  courses!: EntityTable<LocalCourse, 'id'>;
  sessions!: EntityTable<LocalSession, 'id'>;
  sync_queue!: EntityTable<SyncQueueItem, 'id'>;

  constructor() {
    super('AttendDB');
    this.version(1).stores({
      semesters: 'id, user_id, is_active, deleted_at, synced_at',
      courses: 'id, user_id, semester_id, deleted_at, synced_at',
      sessions:
        'id, course_id, user_id, scheduled_date, status, deleted_at, synced_at',
      sync_queue: '++id, table_name, operation, record_id, created_at, retry_count',
    });
  }
}

export const db = new AttendDB();

/**
 * Clears all local data. Used on sign-out so a different account cannot
 * read the previous user's cached records.
 */
export async function clearLocalDb(): Promise<void> {
  await db.transaction(
    'rw',
    db.semesters,
    db.courses,
    db.sessions,
    db.sync_queue,
    async () => {
      await Promise.all([
        db.semesters.clear(),
        db.courses.clear(),
        db.sessions.clear(),
        db.sync_queue.clear(),
      ]);
    }
  );
}
