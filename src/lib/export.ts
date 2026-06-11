import { format } from 'date-fns';
import { db } from './db';
import { fromDateKey, todayKey } from '../utils/dates';
import type { Semester, Course, Session, LocalRecord } from '../types';

/** Remove Dexie-only fields so exports contain clean domain rows. */
function stripLocal<T extends LocalRecord>(
  record: T
): Omit<T, 'synced_at' | '_local_only'> {
  const clean: Partial<T> = { ...record };
  delete clean.synced_at;
  delete clean._local_only;
  return clean as Omit<T, 'synced_at' | '_local_only'>;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'course'
  );
}

/** Download every non-deleted record for the user as a single JSON file. */
export async function exportAllDataAsJSON(userId: string): Promise<void> {
  const [semesters, courses, sessions] = await Promise.all([
    db.semesters.filter((r) => !r.deleted_at).toArray(),
    db.courses.filter((r) => !r.deleted_at).toArray(),
    db.sessions.filter((r) => !r.deleted_at).toArray(),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user_id: userId,
    semesters: semesters.map((s) => stripLocal(s)) as Semester[],
    courses: courses.map((c) => stripLocal(c)) as Course[],
    sessions: sessions.map((s) => stripLocal(s)) as Session[],
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  triggerDownload(blob, `attend-export-${todayKey()}.json`);
}

/** Download a single course's sessions as CSV. Works fully offline. */
export function exportCourseAsCSV(
  _courseId: string,
  courseName: string,
  sessions: Session[]
): void {
  const sorted = [...sessions]
    .filter((s) => !s.deleted_at)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  const header = 'Date,Day,Status,Notes';
  const rows = sorted.map((s) => {
    const day = format(fromDateKey(s.scheduled_date), 'EEEE');
    return [
      csvCell(s.scheduled_date),
      csvCell(day),
      csvCell(s.status),
      csvCell(s.notes ?? ''),
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `attend-${slugify(courseName)}-${todayKey()}.csv`);
}
