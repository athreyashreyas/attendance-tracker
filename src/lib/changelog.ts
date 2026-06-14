export interface Release {
  version: string;
  date: string; // 'YYYY-MM-DD'
  title: string;
  notes: string[];
  /** Feature releases worth reading; minor/bug-fix releases leave this off. */
  major?: boolean;
}

/**
 * Release notes, newest first. Add a new entry at the top for every version
 * bump and keep the tone warm and light. The first entry's version is the
 * single source of truth for the app's current version (see APP_VERSION).
 */
export const CHANGELOG: Release[] = [
  {
    version: '0.5.1',
    date: '2026-06-14',
    major: true,
    title: 'Lots of little touches',
    notes: [
      'Long forms in the pop-up sheets scroll smoothly again. Drag the little handle to dismiss, scroll the rest.',
      'A fresh set of class colours, each one its own and all at home on the parchment.',
      'Deleting a class now asks first, and tells you how much attendance you would be letting go, so nothing disappears by surprise. Once it is gone, you land back on the home screen with the rest.',
      'Add a class to any day and leave it unmarked. Pick "Not yet" and it waits on the calendar until you record how it went.',
      'The home screen now counts only the classes still left to mark today, so cancelled or already-marked days stop nudging you.',
      'This very list now flags the major updates, so you can spot the feature releases at a glance.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-06-14',
    major: true,
    title: 'Your classes take the lead',
    notes: [
      'Classes are now the heart of things. Add anything you like, a semester subject or a Saturday dance class, with or without a semester attached.',
      'New filters along the top let you flip between everything, a single semester, or your standalone classes.',
      'Breaks are yours to shape. Cancel every class across a stretch of days, or just tick the few that are actually off.',
      'The Mark tab knows when your day is done and quietly steps aside, so you never re-mark by accident. Need to change something later? The calendar has you covered.',
      'Eight new colours joined the palette, so every class can feel like its own.',
    ],
  },
  {
    version: '0.4.7',
    date: '2026-06-12',
    title: 'A screen that sits just right',
    notes: [
      'We taught the app to fit your screen exactly, with no stray gaps and no clipped edges, whichever way you hold it.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-06-10',
    major: true,
    title: 'Updates that just arrive',
    notes: [
      'New versions now flow in on their own. No more removing and re-adding to your home screen.',
      'A little version number lives here in Settings so you can always see what you are on.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-06-08',
    major: true,
    title: 'See the whole term',
    notes: [
      'Set when each class begins and ends, watch the sessions left tick down, and know exactly how many you can still miss.',
      'A calendar and a per-class overview to see your attendance at a glance.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-06-05',
    major: true,
    title: 'Hello, Attend',
    notes: [
      'Track attendance for every class, stay above your threshold, and keep it all on your device with a quiet backup to your account.',
    ],
  },
];

/** Current app version, taken from the newest release. */
export const APP_VERSION = CHANGELOG[0].version;
