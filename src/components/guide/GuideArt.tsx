import { motion } from 'framer-motion';
import { Check, X, Bug, GripVertical, Lightbulb } from 'lucide-react';
import { ABSENT_COLOR } from '../../lib/colors';
import type { GuideArtKind } from '../../lib/guide';

/**
 * Small, calm illustrations so the guide (and What's new) can show rather than
 * only tell. Each one is built from the app's own parts — the same squares,
 * dots and chips you meet on the real screens — so what you learn here is what
 * you see afterwards.
 */

const SAGE = '#4F7942';
const PLUM = '#8A3F7A';

export function GuideArt({ kind }: { kind: GuideArtKind }) {
  switch (kind) {
    // The ring from a class page: where you stand, against the line you must hold.
    case 'ring': {
      const pct = 82;
      const r = 40;
      const circumference = 2 * Math.PI * r;
      return (
        <svg viewBox="0 0 110 110" className="h-28 w-28" aria-hidden="true">
          <circle cx="55" cy="55" r={r} fill="none" stroke="#F0EDE6" strokeWidth="9" />
          <motion.circle
            cx="55"
            cy="55"
            r={r}
            fill="none"
            stroke={SAGE}
            strokeWidth="9"
            strokeLinecap="round"
            transform="rotate(-90 55 55)"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
          />
          {/* The threshold, marked on the track the way the real ring marks it. */}
          <line
            x1="55"
            y1="10"
            x2="55"
            y2="20"
            stroke="#9B9890"
            strokeWidth="2"
            strokeLinecap="round"
            transform="rotate(270 55 55)"
          />
          <text
            x="55"
            y="52"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'DM Serif Display', serif"
            fontSize="22"
            fill="#1A1A18"
          >
            82%
          </text>
          <text
            x="55"
            y="70"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontSize="9"
            fill="#6B6960"
          >
            of 75%
          </text>
        </svg>
      );
    }

    // The weekday chips from the class form: the days a class meets.
    case 'schedule':
      return (
        <div className="flex w-full max-w-[260px] gap-1.5">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => {
            const on = [0, 2, 4].includes(i);
            return (
              <span
                key={d}
                className={`flex h-9 flex-1 items-center justify-center rounded-lg font-sans text-xs font-medium ${
                  on ? 'bg-sage-500 text-white' : 'bg-parchment-200 text-ink-500'
                }`}
              >
                {d}
              </span>
            );
          })}
        </div>
      );

    // A timetable that moved partway through the term: the days it ran on
    // before the change, and the days it runs on now, one above the other.
    case 'timetable':
      return (
        <div className="w-full max-w-[250px]">
          {[
            { days: ['Mo', 'We'], span: 'Until 14 Sep', now: false },
            { days: ['Tu', 'Th'], span: 'From 15 Sep', now: true },
          ].map((row, i) => (
            <div key={row.span} className="flex gap-3">
              <div className="flex w-3 shrink-0 flex-col items-center pt-3">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: row.now ? PLUM : `${PLUM}4D` }}
                />
                {i === 0 && (
                  <span
                    className="mt-1 w-px flex-1"
                    style={{ backgroundColor: `${PLUM}40` }}
                  />
                )}
              </div>
              <div className={`min-w-0 flex-1 ${i === 0 ? 'pb-3' : ''}`}>
                <div className="flex gap-1.5">
                  {['Mo', 'Tu', 'We', 'Th', 'Fr'].map((d) => {
                    const on = row.days.includes(d);
                    return (
                      <span
                        key={d}
                        className={`flex h-8 flex-1 items-center justify-center rounded-lg font-sans text-[11px] font-medium ${
                          on
                            ? row.now
                              ? 'bg-sage-500 text-white'
                              : 'bg-sage-400/50 text-white'
                            : 'bg-parchment-200 text-ink-300'
                        }`}
                      >
                        {d}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-1.5 font-sans text-[11px] text-ink-500">
                  {row.span}
                  {row.now && ' · now'}
                </p>
              </div>
            </div>
          ))}
        </div>
      );

    // A weekday that holds the class twice, and the two classes it becomes.
    case 'double':
      return (
        <div className="w-full max-w-[240px] space-y-2.5">
          <div className="flex justify-center gap-1.5">
            {['Mo', 'Tu', 'We'].map((d) => (
              <span
                key={d}
                className={`flex h-9 w-14 items-center justify-center rounded-lg font-sans text-xs font-medium ${
                  d === 'We'
                    ? 'bg-parchment-200 text-ink-500'
                    : 'bg-sage-500 text-white'
                }`}
              >
                {d}
                {d === 'Tu' && <span className="ml-0.5 opacity-80">×2</span>}
              </span>
            ))}
          </div>
          {[
            ['1st of 2', 'Present'],
            ['2nd of 2', 'Absent'],
          ].map(([slot, status], i) => (
            <div
              key={slot}
              className="flex items-center gap-3 rounded-card bg-parchment-50 p-3 shadow-sm"
            >
              <span
                className="h-7 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: PLUM }}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-sans text-sm font-medium text-ink-900">
                  Physics
                </span>
                <span className="block font-sans text-xs text-ink-300">{slot}</span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 font-sans text-[11px] font-medium ${
                  i === 0 ? 'bg-sage-500 text-white' : 'bg-rose-500 text-white'
                }`}
              >
                {status}
              </span>
            </div>
          ))}
        </div>
      );

    // Arranging the home screen: a card lifted out of the stack by its handle.
    case 'arrange':
      return (
        <div className="w-full max-w-[240px] space-y-2">
          {[
            { name: 'Physics', color: PLUM, lifted: false },
            { name: 'Statistics', color: SAGE, lifted: true },
            { name: 'Latin', color: '#B8860B', lifted: false },
          ].map((row) => (
            <div
              key={row.name}
              className={`flex items-center gap-3 rounded-card bg-parchment-50 p-3 ${
                row.lifted ? 'shadow-md' : 'shadow-sm'
              }`}
              style={
                row.lifted
                  ? { transform: 'translateX(10px) scale(1.03)' }
                  : undefined
              }
            >
              <span
                className="h-7 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
              <span className="min-w-0 flex-1 font-sans text-sm text-ink-900">
                {row.name}
              </span>
              <span
                className={row.lifted ? 'text-ink-500' : 'text-ink-100'}
                aria-hidden="true"
              >
                <GripVertical size={16} />
              </span>
            </div>
          ))}
        </div>
      );

    // The two big buttons of the Mark deck.
    case 'mark':
      return (
        <div className="grid w-full max-w-[220px] grid-cols-2 gap-3">
          <span className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-sheet bg-sage-500 font-sans text-sm font-semibold text-white shadow-sm">
            <Check size={26} strokeWidth={2.5} />
            Present
          </span>
          <span className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-sheet bg-rose-500 font-sans text-sm font-semibold text-white shadow-sm">
            <X size={26} strokeWidth={2.5} />
            Absent
          </span>
        </div>
      );

    // A fortnight of the calendar: filled dots for marked, hollow for still to come.
    case 'calendar':
      return (
        <div className="w-full max-w-[240px]">
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: 14 }).map((_, i) => {
              const dots =
                i === 2 || i === 9 ? 2 : [0, 4, 7, 11].includes(i) ? 1 : 0;
              const marked = i < 7;
              return (
                <span key={i} className="flex flex-col items-center gap-1 py-1">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full font-sans text-xs ${
                      i === 7 ? 'bg-sage-500 font-semibold text-white' : 'text-ink-900'
                    }`}
                  >
                    {i + 8}
                  </span>
                  <span className="flex h-1.5 items-center gap-0.5">
                    {Array.from({ length: dots }).map((__, j) => (
                      <span
                        key={j}
                        className="h-1.5 w-1.5 rounded-full"
                        style={
                          marked
                            ? { backgroundColor: PLUM }
                            : { boxShadow: `inset 0 0 0 1.5px ${PLUM}` }
                        }
                      />
                    ))}
                  </span>
                </span>
              );
            })}
          </div>
          <div className="mt-1 flex items-center justify-center gap-4 font-sans text-[10px] text-ink-500">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-ink-300" />
              Marked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full ring-1 ring-inset ring-ink-300" />
              Still to come
            </span>
          </div>
        </div>
      );

    // A week of the term with a holiday taken out of it.
    case 'daysoff':
      return (
        <div className="w-full max-w-[240px]">
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => {
              const off = i === 2 || i === 3;
              return (
                <span
                  key={i}
                  className={`flex aspect-square items-center justify-center rounded-md font-sans text-[11px] tabular-nums ${
                    off
                      ? 'bg-parchment-300 text-ink-300 line-through'
                      : 'text-ink-900'
                  }`}
                  style={off ? undefined : { backgroundColor: `${PLUM}29` }}
                >
                  {12 + i}
                </span>
              );
            })}
          </div>
          <p className="mt-2 text-center font-sans text-[11px] text-ink-500">
            Two days taken out of the term
          </p>
        </div>
      );

    // A run of the overview grid, including a day split between two classes.
    case 'grid':
      return (
        <div className="w-full max-w-[260px]">
          <div className="grid grid-cols-5 gap-1.5">
            {(
              [
                ['present', '4'],
                ['absent', '5'],
                ['split', '6'],
                ['cancelled', '7'],
                ['off', '8'],
              ] as const
            ).map(([kindName, label]) => {
              const style: React.CSSProperties =
                kindName === 'present'
                  ? { background: PLUM, color: '#FFFFFF' }
                  : kindName === 'absent'
                    ? { background: ABSENT_COLOR, color: '#1A1A18' }
                    : kindName === 'split'
                      ? {
                          background: `linear-gradient(90deg, ${PLUM} 0%, ${PLUM} 50%, ${ABSENT_COLOR} 50%, ${ABSENT_COLOR} 100%)`,
                          color: '#1A1A18',
                        }
                      : kindName === 'cancelled'
                        ? { background: '#E0DCD2', color: '#6B6960' }
                        : {
                            background: '#F0EDE6',
                            color: '#9B9890',
                            boxShadow: `inset 0 0 0 1px ${PLUM}47`,
                          };
              return (
                <span
                  key={label}
                  style={style}
                  className={`flex aspect-square items-center justify-center rounded-[4px] font-sans text-[11px] tabular-nums ${
                    kindName === 'cancelled' ? 'line-through' : ''
                  }`}
                >
                  {label}
                </span>
              );
            })}
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1.5 text-center font-sans text-[9px] leading-tight text-ink-500">
            <span>Present</span>
            <span>Absent</span>
            <span>One of each</span>
            <span>Cancelled</span>
            <span>Day off</span>
          </div>
        </div>
      );

    // The filter row that scopes a screen to one term.
    case 'filters':
      return (
        <div className="flex flex-wrap justify-center gap-2">
          {['All', 'Autumn 2026', 'Standalone'].map((label, i) => (
            <span
              key={label}
              className={`rounded-full px-3.5 py-1.5 font-sans text-xs font-medium ${
                i === 1 ? 'bg-sage-500 text-white' : 'bg-parchment-200 text-ink-500'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      );

    // A finished term, filed away with its attendance intact.
    case 'archive':
      return (
        <div className="w-full max-w-[240px] space-y-2">
          <p className="font-sans text-[10px] font-medium uppercase tracking-wide text-ink-300">
            Spring 2026
          </p>
          {[
            ['Victorian Literature', '88%'],
            ['Statistics', '76%'],
          ].map(([name, pct]) => (
            <div
              key={name}
              className="flex items-center gap-3 rounded-card bg-parchment-100 p-3"
            >
              <span
                className="h-7 w-1.5 shrink-0 rounded-full opacity-60"
                style={{ backgroundColor: PLUM }}
              />
              <span className="min-w-0 flex-1 truncate font-sans text-sm text-ink-500">
                {name}
              </span>
              <span className="shrink-0 font-sans text-xs text-ink-300">{pct}</span>
            </div>
          ))}
        </div>
      );

    // The dot in the corner, in each of the three states it can be in.
    case 'sync':
      return (
        <div className="flex flex-col gap-2.5">
          {[
            ['#4F7942', 'Up to date'],
            ['#B8782A', 'Syncing now'],
            ['#B85C72', 'Offline, saved on this device'],
          ].map(([color, label]) => (
            <span key={label} className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-sans text-xs text-ink-500">{label}</span>
            </span>
          ))}
        </div>
      );

    // A message written in Settings, and where it gets to. The details along
    // the bottom are the ones the app attaches for you.
    case 'message':
      return (
        <div className="w-full max-w-[240px] space-y-2.5">
          <div className="flex gap-1.5 rounded-lg bg-parchment-200 p-1">
            <span className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-parchment-50 py-2 font-sans text-[11px] font-medium text-ink-900 shadow-sm">
              <Bug size={12} />
              Broken
            </span>
            <span className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 font-sans text-[11px] font-medium text-ink-500">
              <Lightbulb size={12} />
              An idea
            </span>
          </div>

          <div className="rounded-card bg-parchment-50 p-3 shadow-sm">
            <p className="font-sans text-xs leading-relaxed text-ink-700">
              The ring did not move after I marked the second class of a double.
            </p>
            <p className="mt-2 font-sans text-[10px] text-ink-300">
              Attend 0.9.0 · iPhone
            </p>
          </div>

          <motion.div
            className="flex items-center justify-center gap-2"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.35 }}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage-500">
              <Check size={12} strokeWidth={3} className="text-white" />
            </span>
            <span className="font-sans text-[11px] text-ink-500">
              That is with them now
            </span>
          </motion.div>
        </div>
      );

    // Attendance leaving the app in a form anyone can read.
    case 'export':
      return (
        <div className="w-full max-w-[240px] space-y-2">
          {['attend-export.json', 'victorian-literature.csv'].map((file) => (
            <div
              key={file}
              className="flex items-center gap-3 rounded-card bg-parchment-100 p-3"
            >
              <span className="h-7 w-1.5 shrink-0 rounded-full bg-sage-400" />
              <span className="min-w-0 flex-1 truncate font-sans text-sm text-ink-700">
                {file}
              </span>
            </div>
          ))}
        </div>
      );
  }
}
