import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays } from 'date-fns';
import {
  LogOut,
  Plus,
  Download,
  FileText,
  Trash2,
  CheckCircle2,
  Archive,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BottomSheet } from '../components/ui/BottomSheet';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import {
  useSemesters,
  useSemesterMutations,
  type SemesterInput,
} from '../hooks/useSemesters';
import { useCourses } from '../hooks/useCourses';
import { db } from '../lib/db';
import { exportAllDataAsJSON, exportCourseAsCSV } from '../lib/export';
import { formatLongDate, toDateKey } from '../utils/dates';
import type { Semester } from '../types';

const APP_VERSION = '0.4.7';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: semesters } = useSemesters();
  const activeSemester = semesters?.find((s) => s.is_active) ?? null;
  const { data: courses } = useCourses(activeSemester?.id);
  const { activateSemester, archiveSemester, deleteSemester } =
    useSemesterMutations();

  const [semesterForm, setSemesterForm] = useState<Semester | null | 'new'>(
    null
  );
  const [confirmActivate, setConfirmActivate] = useState<Semester | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/auth', { replace: true });
  }

  async function handleDelete(id: string) {
    const ok = await deleteSemester(id);
    if (!ok) setDeleteBlocked(true);
  }

  async function exportCourse(courseId: string, courseName: string) {
    const sessions = await db.sessions
      .where('course_id')
      .equals(courseId)
      .filter((s) => !s.deleted_at)
      .toArray();
    exportCourseAsCSV(courseId, courseName, sessions);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" />

      {/* Account */}
      <Section title="Account">
        <Row label="Signed in as" value={user?.email ?? 'Not signed in'} />
        <Button
          variant="ghost"
          fullWidth
          onClick={handleSignOut}
          className="mt-2 justify-start text-rose-600"
        >
          <LogOut size={16} />
          Sign out
        </Button>
      </Section>

      {/* Semesters */}
      <Section
        title="Semesters"
        action={
          <button
            type="button"
            onClick={() => setSemesterForm('new')}
            className="flex items-center gap-1 font-sans text-sm font-medium text-sage-600"
          >
            <Plus size={16} />
            New
          </button>
        }
      >
        <div className="space-y-2">
          {(semesters ?? []).map((s) => (
            <div
              key={s.id}
              className="rounded-card bg-parchment-100 p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSemesterForm(s)}
                  className="min-w-0 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate font-sans text-sm font-medium text-ink-900">
                      {s.name}
                    </span>
                    {s.is_active && <Badge tone="green">Active</Badge>}
                  </div>
                  <p className="mt-0.5 font-sans text-xs text-ink-500">
                    {formatLongDate(s.start_date)} to {formatLongDate(s.end_date)}
                  </p>
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                {!s.is_active && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setConfirmActivate(s)}
                  >
                    <CheckCircle2 size={14} />
                    Set active
                  </Button>
                )}
                {s.is_active && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => archiveSemester(s.id)}
                  >
                    <Archive size={14} />
                    Archive
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(s.id)}
                  className="text-rose-600"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
          {(semesters?.length ?? 0) === 0 && (
            <p className="font-sans text-sm text-ink-500">No semesters yet.</p>
          )}
        </div>
      </Section>

      {/* Data */}
      <Section title="Data">
        <Button
          variant="secondary"
          fullWidth
          onClick={() => user && exportAllDataAsJSON(user.id)}
          className="justify-start"
        >
          <Download size={16} />
          Export all data (JSON)
        </Button>

        {(courses?.length ?? 0) > 0 && (
          <div className="mt-3">
            <p className="mb-2 font-sans text-xs font-medium text-ink-500">
              Export course attendance (CSV)
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {courses!.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => exportCourse(c.id, c.name)}
                  className="flex w-full items-center gap-3 rounded-card bg-parchment-100 p-3 text-left"
                >
                  <span
                    className="h-6 w-1.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="min-w-0 flex-1 truncate font-sans text-sm text-ink-900">
                    {c.name}
                  </span>
                  <FileText size={16} className="shrink-0 text-ink-300" />
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* About */}
      <Section title="About">
        <Row label="Version" value={APP_VERSION} />
        <p className="mt-2 font-sans text-sm text-ink-500">
          Attend keeps your classes and attendance on your device, and quietly
          backs them up to your account.
        </p>
      </Section>

      <SemesterFormSheet
        target={semesterForm}
        onClose={() => setSemesterForm(null)}
      />

      <Modal
        open={confirmActivate !== null}
        onClose={() => setConfirmActivate(null)}
        title="Switch active semester?"
      >
        <p className="font-sans text-sm text-ink-700">
          Only one semester is active at a time. The dashboard will show{' '}
          <span className="font-semibold">{confirmActivate?.name}</span>.
        </p>
        <div className="mt-5 flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setConfirmActivate(null)}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            onClick={async () => {
              if (confirmActivate) await activateSemester(confirmActivate.id);
              setConfirmActivate(null);
            }}
          >
            Set active
          </Button>
        </div>
      </Modal>

      <Modal
        open={deleteBlocked}
        onClose={() => setDeleteBlocked(false)}
        title="Can't delete semester"
      >
        <p className="font-sans text-sm text-ink-700">
          This semester still has classes recorded. Delete its courses first, or
          archive the semester to keep the data.
        </p>
        <Button
          fullWidth
          className="mt-5"
          onClick={() => setDeleteBlocked(false)}
        >
          Got it
        </Button>
      </Modal>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-sans text-base font-medium text-ink-900">{title}</h2>
        {action}
      </div>
      <div className="rounded-card bg-parchment-50 p-4 shadow-sm">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-sans text-sm text-ink-500">{label}</span>
      <span className="min-w-0 truncate font-sans text-sm font-medium text-ink-900">
        {value}
      </span>
    </div>
  );
}

function SemesterFormSheet({
  target,
  onClose,
}: {
  target: Semester | null | 'new';
  onClose: () => void;
}) {
  const { saveSemester } = useSemesterMutations();
  const isEdit = target !== null && target !== 'new';
  const open = target !== null;

  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const today = new Date();
    if (target && target !== 'new') {
      setName(target.name);
      setStart(target.start_date);
      setEnd(target.end_date);
    } else {
      setName('');
      setStart(toDateKey(today));
      setEnd(toDateKey(addDays(today, 120)));
    }
    setError(null);
  }, [open, target]);

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (end <= start) {
      setError('End date must be after the start date.');
      return;
    }
    setSaving(true);
    try {
      const input: SemesterInput = {
        id: isEdit ? target.id : undefined,
        name,
        start_date: start,
        end_date: end,
      };
      await saveSemester(input);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit semester' : 'New semester'}
    >
      <div className="space-y-4 pb-2">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Autumn 2026"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block font-sans text-xs font-medium text-ink-500">
              Start
            </label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-lg border-0 bg-parchment-50 px-3 py-2.5 font-sans text-sm text-ink-900 ring-1 ring-inset ring-ink-100 focus:ring-2 focus:ring-inset focus:ring-sage-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-sans text-xs font-medium text-ink-500">
              End
            </label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-lg border-0 bg-parchment-50 px-3 py-2.5 font-sans text-sm text-ink-900 ring-1 ring-inset ring-ink-100 focus:ring-2 focus:ring-inset focus:ring-sage-400"
            />
          </div>
        </div>
        {error && <p className="font-sans text-sm text-rose-600">{error}</p>}
        <Button fullWidth size="lg" onClick={handleSave} disabled={saving}>
          {isEdit ? 'Save changes' : 'Create semester'}
        </Button>
      </div>
    </BottomSheet>
  );
}
