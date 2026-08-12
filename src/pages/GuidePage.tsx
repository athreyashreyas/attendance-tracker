import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { GuideArt } from '../components/guide/GuideArt';
import { ReleaseRow } from '../components/settings/ReleaseRow';
import { APP_VERSION, CHANGELOG } from '../lib/changelog';
import { GUIDE, type GuideSection } from '../lib/guide';
import { setSeenVersion } from '../lib/whatsNew';

type Pane = 'new' | 'guide';

/**
 * Two sides of the same screen: what changed, and how the app works. It opens
 * on its own the first time someone lands in Attend (the walk-through) and the
 * first time they open a new version (What's new), and is always here in
 * Settings otherwise.
 */
export function GuidePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // The entry intent, fixed at mount: switching tabs shouldn't rewrite it.
  const entry = useRef(params.get('pane'));
  const firstRun = useRef(params.get('first') === '1');
  const [pane, setPane] = useState<Pane>(
    entry.current === 'guide' ? 'guide' : 'new'
  );
  const [historyOpen, setHistoryOpen] = useState(false);

  // Reaching this screen is what counts as having seen this version, however
  // it was reached, so it never asks twice.
  useEffect(() => {
    setSeenVersion(APP_VERSION);
  }, []);

  const latest = CHANGELOG[0];
  const earlier = CHANGELOG.slice(1);

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-ink-500"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
        {/* Clears the sync dot pinned to the top-right of the scroll area, the
            same way PageHeader keeps its own right-hand slot out of its way. */}
        <span className="mr-8 shrink-0 font-sans text-xs text-ink-300">
          Attend {APP_VERSION}
        </span>
      </div>

      <p className="font-sans text-[10px] font-medium uppercase tracking-wide text-ink-300">
        How Attend works
      </p>
      <h1 className="mt-1 font-serif text-3xl leading-tight text-ink-900">
        {firstRun.current
          ? 'Welcome. Here is the whole of it.'
          : 'Everything, in one read.'}
      </h1>
      <p className="mt-2 font-sans text-sm text-ink-500">
        {firstRun.current
          ? 'A few minutes now and you will not have to wonder later. You can come back to this any time from Settings.'
          : 'What changed in this version, and how the app works, whenever you would like to know again.'}
      </p>

      <div
        role="tablist"
        aria-label="Guide"
        className="mt-5 flex gap-1.5 rounded-lg bg-parchment-200 p-1"
      >
        {(
          [
            ['new', "What's new"],
            ['guide', 'Guide'],
          ] as const
        ).map(([value, label]) => {
          const active = pane === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPane(value)}
              className={`flex-1 rounded-md py-2 font-sans text-sm font-medium transition-colors ${
                active ? 'bg-parchment-50 text-ink-900 shadow-sm' : 'text-ink-500'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {pane === 'new' ? (
        <div className="mt-5">
          <ReleaseRow release={latest} defaultOpen />

          {earlier.length > 0 && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setHistoryOpen((o) => !o)}
                aria-expanded={historyOpen}
                className="flex w-full items-center justify-between py-2 text-left"
              >
                <span className="font-sans text-[10px] font-medium uppercase tracking-wide text-ink-300">
                  Earlier versions
                </span>
                <motion.span
                  animate={{ rotate: historyOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-ink-300"
                >
                  <ChevronDown size={16} />
                </motion.span>
              </button>
              {historyOpen && (
                <div className="mt-2 space-y-2">
                  {earlier.map((release) => (
                    <ReleaseRow
                      key={release.version}
                      release={release}
                      defaultOpen={false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-7">
          {GUIDE.map((section) => (
            <Section key={section.id} section={section} />
          ))}
        </div>
      )}

      {/* Full width on a phone, where it's the thumb's target; on anything
          wider it settles to its own size rather than stretching the width of
          the reading column. */}
      <div className="mt-8 flex justify-center">
        <Button
          size="lg"
          className="w-full sm:w-auto sm:px-12"
          onClick={() => navigate('/dashboard', { replace: true })}
        >
          {firstRun.current ? 'Start using Attend' : 'Back to Attend'}
        </Button>
      </div>
    </div>
  );
}

function Section({ section }: { section: GuideSection }) {
  return (
    <section className="border-t border-parchment-300 pt-6">
      <h2 className="font-serif text-2xl text-ink-900">{section.title}</h2>
      {section.art && (
        <div className="mt-4 flex justify-center rounded-card bg-parchment-50 px-4 py-6 shadow-sm">
          <GuideArt kind={section.art} />
        </div>
      )}
      <div className="mt-4 space-y-3">
        {section.body.map((p, i) => (
          <p key={i} className="font-sans text-sm leading-relaxed text-ink-700">
            {p}
          </p>
        ))}
      </div>
      {section.steps && (
        <ul className="mt-4 space-y-2">
          {section.steps.map((s, i) => (
            <li
              key={i}
              className="flex gap-2.5 font-sans text-sm leading-relaxed text-ink-500"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sage-400" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
