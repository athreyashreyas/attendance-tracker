import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays } from 'date-fns';
import {
  LogOut,
  Plus,
  Download,
  FileText,
  Trash2,
  ChevronRight,
  Archive,
  BookOpen,
  Sparkles,
  Bug,
  Lightbulb,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BottomSheet } from '../components/ui/BottomSheet';
import { DateInput } from '../components/ui/DateInput';
import { Modal } from '../components/ui/Modal';
import { FeedbackSheet } from '../components/settings/FeedbackSheet';
import type { FeedbackKind } from '../lib/feedback';
import { useAuth } from '../hooks/useAuth';
import {
  useSemesters,
  useSemesterMutations,
  type SemesterInput,
} from '../hooks/useSemesters';
import { useAllCourses } from '../hooks/useCourses';
import { useCourseView } from '../hooks/useCourseView';
import { isArchivedRecord } from '../lib/archive';
import { db } from '../lib/db';
import { exportAllDataAsJSON, exportCourseAsCSV } from '../lib/export';
import { APP_VERSION, CHANGELOG } from '../lib/changelog';
import { formatLongDate, toDateKey } from '../utils/dates';
import type { Semester } from '../types';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: allSemesters } = useSemesters();
  const { data: courses } = useAllCourses();
  const { deleteSemester, setSemesterArchived } = useSemesterMutations();
  const { archivedCourses, archivedSemesters } = useCourseView();
  const latest = CHANGELOG[0];

  // Only live semesters are managed here; archived ones live in the archive.
  const semesters = (allSemesters ?? []).filter((s) => !isArchivedRecord(s));

  const [semesterForm, setSemesterForm] = useState<Semester | null | 'new'>(null);
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackKind | null>(null);

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
        <p className="mb-3 font-sans text-xs text-ink-500">
          Optional groups for your classes. A class can belong to a semester or stand
          on its own.
        </p>
        <div className="space-y-2">
          {semesters.map((s) => (
            <div key={s.id} className="rounded-card bg-parchment-100 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSemesterForm(s)}
                  className="min-w-0 text-left"
                >
                  <span className="truncate font-sans text-sm font-medium text-ink-900">
                    {s.name}
                  </span>
                  <p className="mt-0.5 font-sans text-xs text-ink-500">
                    {formatLongDate(s.start_date)} to {formatLongDate(s.end_date)}
                  </p>
                </button>
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => void setSemesterArchived(s.id, true)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500"
                    aria-label={`Archive ${s.name}`}
                    title="Archive"
                  >
                    <Archive size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-rose-600"
                    aria-label={`Delete ${s.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {semesters.length === 0 && (
            <p className="font-sans text-sm text-ink-500">No semesters yet.</p>
          )}
        </div>
      </Section>

      {/* Archive */}
      <Section title="Archive">
        <p className="mb-3 font-sans text-xs text-ink-500">
          Finished terms and classes move here on their own once their last date
          has passed. Nothing is deleted, and anything can be brought back.
        </p>
        <button
          type="button"
          onClick={() => navigate('/archive')}
          className="flex w-full items-center gap-3 rounded-card bg-parchment-100 p-3.5 text-left"
        >
          <Archive size={18} className="shrink-0 text-ink-500" />
          <div className="min-w-0 flex-1">
            <p className="font-sans text-sm font-medium text-ink-900">
              Archived classes
            </p>
            <p className="font-sans text-xs text-ink-500">
              {archivedCourses.length === 0 && archivedSemesters.length === 0
                ? 'Nothing put away yet'
                : [
                    archivedCourses.length > 0 &&
                      `${archivedCourses.length} ${
                        archivedCourses.length === 1 ? 'class' : 'classes'
                      }`,
                    archivedSemesters.length > 0 &&
                      `${archivedSemesters.length} ${
                        archivedSemesters.length === 1 ? 'term' : 'terms'
                      }`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-ink-300" />
        </button>
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
              Export class attendance (CSV)
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

      {/* Speaking to us */}
      <Section title="Make Attend Yours">
        <p className="mb-3 font-sans text-xs text-ink-500">
          Attend is built and maintained by one person, and this goes
          straight to their desk. Say what broke, or what you wish the app did. It does not need
          to be long.
        </p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setFeedback('bug')}
            className="flex w-full items-center gap-3 rounded-card bg-parchment-100 p-3.5 text-left"
          >
            <Bug size={18} className="shrink-0 text-ink-500" />
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm font-medium text-ink-900">
                Report something broken
              </p>
              <p className="font-sans text-xs text-ink-500">
                Found a bug, or something that does not work as you expect? Let us know so we can fix it.
              </p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-ink-300" />
          </button>
          <button
            type="button"
            onClick={() => setFeedback('idea')}
            className="flex w-full items-center gap-3 rounded-card bg-parchment-100 p-3.5 text-left"
          >
            <Lightbulb size={18} className="shrink-0 text-ink-500" />
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm font-medium text-ink-900">
                Suggest something
              </p>
              <p className="font-sans text-xs text-ink-500">
                Any and all ideas are welcome. Especially half-formed ones.
              </p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-ink-300" />
          </button>
        </div>
      </Section>

      {/* Guide and what's new */}
      <Section title="Guide">
        <p className="mb-3 font-sans text-xs text-ink-500">
          How Attend works, start to finish, and what changed in each version.
        </p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => navigate('/guide?pane=guide')}
            className="flex w-full items-center gap-3 rounded-card bg-parchment-100 p-3.5 text-left"
          >
            <BookOpen size={18} className="shrink-0 text-ink-500" />
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm font-medium text-ink-900">
                How Attend works
              </p>
              <p className="font-sans text-xs text-ink-500">
                The whole app, walked through
              </p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-ink-300" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/guide?pane=new')}
            className="flex w-full items-center gap-3 rounded-card bg-parchment-100 p-3.5 text-left"
          >
            <Sparkles size={18} className="shrink-0 text-ink-500" />
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm font-medium text-ink-900">
                What&apos;s new
              </p>
              <p className="font-sans text-xs text-ink-500">
                {latest.version} · {latest.title}
              </p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-ink-300" />
          </button>
        </div>
      </Section>

      {/* About */}
      <Section title="About">
        <Row label="Version" value={APP_VERSION} />
        <p className="mt-2 font-sans text-sm text-ink-500">
          Attend keeps your classes and attendance on your device, and quietly backs
          them up to your account.
        </p>
      </Section>

      <FeedbackSheet kind={feedback} onClose={() => setFeedback(null)} />

      <SemesterFormSheet
        target={semesterForm}
        onClose={() => setSemesterForm(null)}
      />

      <Modal
        open={deleteBlocked}
        onClose={() => setDeleteBlocked(false)}
        title="Can't delete semester"
      >
        <p className="font-sans text-sm text-ink-700">
          This semester still has classes with recorded attendance. Move those classes
          to another semester (or standalone) first, or delete them.
        </p>
        <Button fullWidth className="mt-5" onClick={() => setDeleteBlocked(false)}>
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
      <span className="selectable min-w-0 truncate font-sans text-sm font-medium text-ink-900">
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
            <DateInput value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block font-sans text-xs font-medium text-ink-500">
              End
            </label>
            <DateInput value={end} onChange={(e) => setEnd(e.target.value)} />
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
