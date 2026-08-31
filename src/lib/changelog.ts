import type { GuideArtKind } from './guide';

export interface Release {
  version: string;
  date: string; // 'YYYY-MM-DD'
  title: string;
  notes: string[];
  /** Feature releases worth reading; minor/bug-fix releases leave this off. */
  major?: boolean;
  /**
   * Short, followable steps for finding what the release brought, written for
   * how the app navigates today rather than how it did at the time, so an old
   * entry never points at something that has since moved.
   */
  howTo?: string[];
  /**
   * Little demonstrations shown under an open release, so What's new can show
   * a feature rather than only describe it.
   */
  art?: GuideArtKind[];
}

/**
 * Release notes, newest first. Add a new entry at the top for every version
 * bump and keep the tone warm and light. The first entry's version is the
 * single source of truth for the app's current version (see APP_VERSION).
 *
 * History is kept readable rather than exhaustive: small releases are folded
 * into the feature release they belong with, under the later version number.
 * The lasting how-to lives in guide.ts, which these entries point at.
 */
export const CHANGELOG: Release[] = [
  {
    version: '0.10.0',
    date: '2026-08-31',
    major: true,
    title: 'Class days that can change partway through',
    notes: [
      'Say your Tuesday lecture moves to Thursday halfway through the term. Until now, changing the class days in Attend changed them for the whole term, so the Tuesdays you had already sat through stopped counting as class days at all, and the Thursdays you had not yet been to appeared all the way back in week one.',
      'Now, when you change the days of a class that has already been running, Attend asks one question: did the timetable change, or was it wrong all along? Choose "Save the change", pick the date the new days started, and that is the whole job.',
      'Everything before that date keeps the days it actually ran on, and every class you have marked stays exactly where it is. Your percentage is worked out from the classes you marked, so it does not move. What changes is the classes still to come, which follow the new days from that date onwards.',
      'The class page then shows a Timetable list: the days the class met before the change, the days it meets now, and when they moved. The calendar, the Mark deck and the overview grid all follow it, so last month still shows last month.',
      'You can set a change for a date still to come, put right the days of a run that has already passed by tapping it in the list above the day buttons, and undo a change if you recorded one by mistake. And if the days were simply typed in wrongly to begin with, choose "It has always been..." instead and the whole term is corrected in one go.',
    ],
    howTo: [
      'Open the class and tap the pencil at the top right.',
      'Set the new class days. A line appears telling you Attend will ask about the change.',
      'Tap "Save changes", then pick the date the new days started and choose "Save the change".',
      'Look at the Timetable list on the class page to see both sets of days and the day they changed over.',
    ],
    art: ['timetable'],
  },
  {
    version: '0.9.0',
    date: '2026-08-16',
    major: true,
    title: 'A way to make attend exactly what you want',
    notes: [
      'If Attend has ever been any good, it is because of the thoughtful voices and consideration of everyone who has used it. As Attend grows, we want that ethos of bespoke attention to remain. Settings now has a line straight to the app\'s creator.',
      'You can report a bug, suggest a new feature, or just send an idea. Bugs are fixed as soon as possible, and ideas are read and considered for the next version. Every single message is deeply valued and given attention to.',
      'If you are offline or the message cannot get through, nothing is lost. Attend syncs the message and sends it when you are back online, so you can write it and forget it.',
      'Replies come back to the email you signed up with, so there is nothing to go and check and nothing to miss. Answer that mail and the conversation simply carries on.',
      'The overview grid on a class page also reads properly now. Each month begins on its own 1st instead of running into the one before it, and a term that starts on the 8th or ends mid-month no longer leaves a blank week sitting in the grid.',
    ],
    howTo: [
      'Open Settings and scroll to "Make Attend Yours", then choose whether it is a bug or an idea.',
    ],
    art: ['message'],
  },
  {
    version: '0.8.0',
    date: '2026-08-12',
    major: true,
    title: 'Days that hold more than one class',
    notes: [
      'A class can now meet more than once on the same day. Set how many times each weekday holds it, and a double lecture, a two-period lab, or a tutorial straight after the theory hour each becomes its own class with its own attendance.',
      'Marking asks for them one at a time: the 1st of 2, then the 2nd. Missing the second half of a double is one absence now, not a whole day, and your percentage counts every class that actually ran.',
      'For a one-off extra, add a class to any day from the calendar. It sits alongside whatever is already on that day instead of replacing it.',
      'Days that hold two classes read as two everywhere: two dots on the calendar, a square split down the middle on the overview grid, and the term count on a class counting each one in full.',
      'Cancelling a break no longer asks for two dates when you only need one. Choose a single day, pick the classes, and they are called off just for that day.',
      'And this screen is new: a guide to how Attend works, sitting beside What\'s new, so the whole app can be read through in one go.',
    ],
    howTo: [
      'Open a class, and under Class days expand "More than one class a day" to raise the count for a weekday.',
      'On the Calendar, tap a day and use "Add an extra class" for a one-off.',
      'To cancel a single day, tap the crossed-out calendar at the top right of the Calendar.',
    ],
    art: ['double', 'grid'],
  },
  {
    version: '0.7.0',
    date: '2026-08-04',
    major: true,
    title: 'An archive for finished terms',
    notes: [
      'Classes and semesters now step aside once they are over. The morning after a class holds its last session, it files itself away, so your home screen stays about the term you are actually in.',
      'Everything put away lives in the Archive, grouped by term. Each class still opens its full record, nothing is ever deleted, and one tap brings it back. Archiving a term takes its classes with it, and restoring hands them all back.',
      'You can also archive a class or a whole semester early, from the class edit sheet or the semester row in Settings.',
      'Changing a class to a shorter run of dates now tells you what that costs before it saves: how many marked classes fall outside the new dates, and how many days off would be forgotten.',
      'Text no longer selects itself when you press and hold, so the calendar and the class cards feel like buttons rather than a page.',
    ],
    howTo: [
      'Open the Archive from Settings, or from the line below your classes on the home screen.',
      'To file something away early, use Archive class in the class edit sheet.',
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
    howTo: [
      'Open a class, tap the pencil, and expand Days off to take dates out of the term.',
      'On a class page, use the chips above the class list to show only absences or only cancellations.',
    ],
    art: ['daysoff'],
  },
  {
    version: '0.5.5',
    date: '2026-07-31',
    major: true,
    title: 'See how far along each class is',
    notes: [
      'Each class on the home screen now carries a row of small ticks, one per class in its term, inked in as each one passes. A glance tells you whether a class is nearly over or has barely begun.',
      'Open a class and you will find "This term": a pie of the whole term that fills as it goes, split into the classes you attended and the ones you missed, with the rest of the circle left open for what is still to come.',
      'Missed classes fill in with a soft, muted tone instead of an empty outline, so an absence reads at a glance without ever clashing with your class colour.',
      'A class you scheduled ahead with "Not yet" now turns up in the Mark tab and on the home screen when its day arrives, ready to mark.',
      'The dot in the top corner is now a button: tap it for your sync status and to push a sync on the spot. Changes from your other devices show the moment you open the app.',
      'Animations respect your device\'s Reduce Motion setting, and moving around the app is instant, with no loading buffers between screens.',
    ],
    howTo: [
      'Open any class with a first and last date to see This term.',
      'Tap the dot at the top right for sync status and a manual sync.',
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
      'Add a class to any day and leave it unmarked: pick "Not yet" and it waits on the calendar until you record how it went.',
      'Deleting a class now asks first, and tells you how much attendance you would be letting go, so nothing disappears by surprise.',
      'The Mark tab knows when your day is done and quietly steps aside, and the home screen counts only the classes still left to mark.',
      'A fresh set of class colours, each one its own and all at home on the parchment, and long forms in the pop-up sheets scroll smoothly again.',
    ],
    howTo: [
      'Use the filter row at the top of the home screen or the Calendar to change what you are looking at.',
      'On the Calendar, tap a day and choose "Not yet" to place a class you will mark later.',
    ],
  },
  {
    version: '0.4.7',
    date: '2026-06-12',
    major: true,
    title: 'Updates that just arrive',
    notes: [
      'New versions now flow in on their own. No more removing and re-adding to your home screen.',
      'A version number lives in Settings so you can always see what you are on.',
      'The app fits your screen exactly, with no stray gaps and no clipped edges, whichever way you hold it.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-06-08',
    major: true,
    title: 'See the whole term',
    notes: [
      'Set when each class begins and ends, watch the classes left tick down, and know exactly how many you can still miss.',
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
