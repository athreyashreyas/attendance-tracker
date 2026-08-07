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
    version: '0.7.1',
    date: '2026-08-07',
    title: 'Cancel a single day',
    notes: [
      'Cancelling a break no longer asks for two dates when you only need one. Open it from the calendar, choose a single day, and the classes you pick are called off just for that day.',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-08-04',
    major: true,
    title: 'An archive for finished terms',
    notes: [
      'Classes and semesters now step aside once they are over. The morning after a class holds its last session, it files itself away, so your home screen stays about the term you are actually in.',
      'Everything put away lives in the Archive, reached from Settings or from the line below your classes. It is grouped by term, each class still opens its full record, and nothing is ever deleted. One tap brings anything back.',
      'You can also archive a class or a whole semester early, from the class edit sheet or the semester row in Settings. Archiving a term takes its classes with it, and restoring it hands them all back.',
      'Changing a class to a shorter run of dates now tells you what that costs before it saves: how many marked classes fall outside the new dates, and how many days off would be forgotten.',
      'Text no longer selects itself when you press and hold, so the calendar and the class cards feel like buttons rather than a page.',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-08-04',
    major: true,
    title: 'Dates on the grid, and a term shaped like yours',
    notes: [
      'The overview grid on a class page now carries the date in every square, with the month named above each row that starts one. When you need to raise something about a particular day, you can read it straight off the grid.',
      'The class list sits behind a row of filters, so you can pull up just the days you were absent, or just the cancelled ones, and see them by date.',
      'A term is no longer a plain run from the first class to the last. When you add a class, you can now open Days off and take out the days it will not meet: tap the odd holiday, or switch to a range and knock out a whole break in two taps.',
      'Days off are left out of your schedule entirely rather than counted as cancelled, so they never touch your percentage, and you will not be asked to mark a class on a holiday. They show as hollow squares on the grid.',
    ],
  },
  {
    version: '0.5.5',
    date: '2026-07-31',
    major: true,
    title: 'See how far along each class is',
    notes: [
      'Each class on the home screen now carries a row of small ticks, one per class in its term, inked in as each one passes. A glance tells you whether a class is nearly over or has barely begun.',
      'The ticks are drawn in the class\'s own colour, so they stay clear of the ring on the right: that one is still about how you are doing, not how far along you are.',
      'Open a class and you will find "This term": a pie of the whole term that fills as it goes, split into the classes you attended and the ones you missed, with the rest of the circle left open for what is still to come.',
      'Classes with no end date carry on as they were, since there is nothing to measure them against yet.',
    ],
  },
  {
    version: '0.5.4',
    date: '2026-07-24',
    title: 'A clearer read on the days you missed',
    notes: [
      'Missed classes now fill in with a soft, muted tone instead of an empty outline, so an absence reads at a glance without ever clashing with your class colour.',
      'The class list on a course page tucks away and springs back a little quicker.',
    ],
  },
  {
    version: '0.5.3',
    date: '2026-07-03',
    title: 'Sync on demand, and a quieter ride',
    notes: [
      'The little dot in the top corner is now a button. Tap it to see your sync status and push a manual sync whenever you like: useful after a patchy connection.',
      'Animations now respect your device\'s Reduce Motion setting, so everything goes instant if you prefer it that way.',
      'Classes in the list slide into place when you switch filters, instead of snapping.',
      'Navigating around the app is instant with no loading buffers between screens.',
    ],
  },
  {
    version: '0.5.2',
    date: '2026-06-19',
    title: 'Planned classes turn up to be marked',
    notes: [
      'A class you scheduled ahead with "Not yet" now appears in the Mark tab and on the home screen when its day arrives, ready to mark, instead of waiting quietly in the calendar.',
      'Changes from your other devices now show the moment you open the app, so a colour or class you changed on another device no longer waits for you to wander into the calendar.',
    ],
  },
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
