import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { formatLongDate } from '../../utils/dates';
import { GuideArt } from '../guide/GuideArt';
import type { Release } from '../../lib/changelog';

/**
 * One expandable release in What's new. Tapping the row reveals its notes and,
 * where the release brought something to go and find, the steps for finding it.
 * Major (feature) releases are tinted and badged.
 */
export function ReleaseRow({
  release,
  defaultOpen,
}: {
  release: Release;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAllNotes, setShowAllNotes] = useState(false);

  // Keep long release lists tidy: show a handful and let the rest expand.
  const MAX_VISIBLE_NOTES = 4;
  const condensed = release.notes.length > MAX_VISIBLE_NOTES;
  const visibleNotes =
    condensed && !showAllNotes
      ? release.notes.slice(0, MAX_VISIBLE_NOTES)
      : release.notes;
  const hiddenCount = release.notes.length - MAX_VISIBLE_NOTES;

  return (
    <div
      className={`overflow-hidden rounded-card ${
        release.major ? 'bg-sage-50 ring-1 ring-sage-100' : 'bg-parchment-100'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3.5 text-left"
      >
        <span className="shrink-0 rounded-full bg-sage-100 px-2 py-0.5 font-sans text-[11px] font-semibold text-sage-700">
          {release.version}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words font-sans text-sm font-medium text-ink-900">
            {release.title}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="font-sans text-xs text-ink-500">
              {formatLongDate(release.date)}
            </span>
            {release.major && (
              <span className="rounded-full bg-sage-500 px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-white">
                Major
              </span>
            )}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-ink-300"
        >
          <ChevronDown size={18} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5">
              <ul className="space-y-2">
                {visibleNotes.map((note, i) => (
                  <li
                    key={i}
                    className="flex gap-2 font-sans text-sm leading-relaxed text-ink-700"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sage-400" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
              {condensed && (
                <button
                  type="button"
                  onClick={() => setShowAllNotes((s) => !s)}
                  className="mt-2.5 font-sans text-xs font-medium text-sage-600"
                >
                  {showAllNotes ? 'Show less' : `Show ${hiddenCount} more`}
                </button>
              )}

              {release.art && release.art.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                  {release.art.map((kind) => (
                    <div
                      key={kind}
                      className="flex items-center justify-center rounded-card bg-parchment-50/70 px-4 py-4 shadow-sm"
                    >
                      <GuideArt kind={kind} />
                    </div>
                  ))}
                </div>
              )}

              {release.howTo && release.howTo.length > 0 && (
                <div className="mt-4">
                  <p className="font-sans text-[10px] font-medium uppercase tracking-wide text-ink-300">
                    Where to find it
                  </p>
                  <ol className="mt-2 space-y-2">
                    {release.howTo.map((step, i) => (
                      <li
                        key={i}
                        className="flex gap-2.5 font-sans text-sm leading-relaxed text-ink-700"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-100 font-sans text-[11px] font-semibold text-sage-700">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
