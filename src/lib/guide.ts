// The in-app guide (Settings -> How Attend works, and the Guide tab beside
// What's new). Evergreen: keep this current as features land, and write it for
// how the app works today rather than how it worked when a feature shipped.
// The What's new side reads the latest release from changelog.ts, so that part
// keeps itself; these sections are the lasting how-to.

/** The little demonstrations drawn by GuideArt. */
export type GuideArtKind =
  | 'ring'
  | 'schedule'
  | 'double'
  | 'mark'
  | 'calendar'
  | 'daysoff'
  | 'grid'
  | 'filters'
  | 'archive'
  | 'sync'
  | 'export'
  | 'message';

export interface GuideSection {
  id: string;
  title: string;
  body: string[];
  /** Short, followable steps. Skip them where the prose already suffices. */
  steps?: string[];
  art?: GuideArtKind;
}

export const GUIDE: GuideSection[] = [
  {
    id: 'idea',
    title: 'The idea',
    body: [
      'Attend is a record of the classes you turned up to, and a straight answer to the question behind it: how many more can I miss?',
      'You set up each class once, with the days it meets and the attendance you need. From then on the app is mostly two taps a day, and everything else is reading.',
    ],
    art: 'ring',
  },
  {
    id: 'classes',
    title: 'Setting up a class',
    body: [
      'A class carries its own days of the week, its own colour, its own first and last date, and the minimum attendance you have to hold.',
      'Dates are worth setting. With them, Attend knows how many classes are still to come, and can tell you what you can afford to miss for the rest of the term rather than only where you stand today.',
    ],
    steps: [
      'Tap + on the home screen, name the class, and pick the weekdays it meets.',
      'Set the first and last class, and the minimum attendance you need.',
      'Open Days off to take out holidays and breaks before they happen.',
    ],
    art: 'schedule',
  },
  {
    id: 'double-days',
    title: 'More than one class a day',
    body: [
      'Some days hold a class twice: a double lecture, a lab that runs two periods, a tutorial straight after the theory hour. Each one is its own class with its own attendance, so missing the second is a single absence, not a whole day.',
      'Set it on the class itself and it repeats every week. For a one-off extra, add it to the day from the calendar instead.',
    ],
    steps: [
      'In the class, under Class days, open "More than one class a day" and raise the count for that weekday.',
      'Days that meet twice carry a ×2 on the day chip, and the term count above Days off counts them in full.',
      'Marking asks for each one in turn: the 1st of 2, then the 2nd.',
    ],
    art: 'double',
  },
  {
    id: 'marking',
    title: 'Marking your day',
    body: [
      'The Mark tab deals your classes for today one card at a time: present, absent, or cancelled. When the day is done it steps aside rather than offering to mark anything twice.',
      'The home screen carries a banner while classes are still unmarked, counting only what is genuinely left.',
    ],
    steps: [
      'Tap the banner on the home screen, or the Mark tab.',
      'Swipe between cards to go back and change something.',
      'A class marked cancelled sits outside your percentage entirely.',
    ],
    art: 'mark',
  },
  {
    id: 'calendar',
    title: 'The calendar',
    body: [
      'The calendar is the whole picture: a filled dot for a class you have marked, a hollow one for a class still to come. Tap any day to see what it holds and to record or change it.',
      'A day can also take a class it does not normally have. Add an extra class from the day itself and mark it whenever you like.',
    ],
    steps: [
      'Tap a day to open it, then tap any class on it to record or change it.',
      'Under "Add an extra class", pick a class to place another one on that day.',
      'Use the filter along the top to look at one semester, or just your standalone classes.',
    ],
    art: 'calendar',
  },
  {
    id: 'breaks',
    title: 'Days off and breaks',
    body: [
      'There are two ways to lose a class, and they mean different things. A day off is removed from the schedule outright: it never becomes a class, never asks to be marked, and never touches your percentage. A cancellation is a class that was going to happen and did not, recorded as cancelled and left out of the totals.',
      'Set days off on the class when you know the term calendar in advance. Cancel a break from the calendar when something is called off later.',
    ],
    steps: [
      'Days off: open the class, expand Days off, and tap the dates. Switch to "A whole break" to take out a stretch in two taps.',
      'Cancelling: on the Calendar, tap the crossed-out calendar icon at the top right.',
      'Choose a single day or a stretch of days, pick which classes it affects, and anything you have already marked is left alone.',
    ],
    art: 'daysoff',
  },
  {
    id: 'class-page',
    title: 'A class in detail',
    body: [
      'Open a class and the ring shows where you stand against your threshold, with the plain numbers beside it. Under that sits the sentence that matters: how many more you can miss, or how many you must attend in a row to climb back.',
      'With dates set, "This term" shows the term as a pie that fills as it goes, and the classes you have attended and missed against what is still to come.',
      'The overview grid at the bottom is the term day by day. Filled means present, muted means absent, struck through means cancelled, hollow with an outline means a day off. A day holding two classes is split down the middle, one half for each.',
    ],
    steps: [
      'Tap any square on the grid to record or change that day.',
      'On a day with more than one class, the grid asks which one you mean.',
      'Use the filters above the class list to pull up only the absences, or only the cancelled ones.',
    ],
    art: 'grid',
  },
  {
    id: 'semesters',
    title: 'Semesters and standalone classes',
    body: [
      'A semester is a name and a span of dates that classes can sit inside, so a class can take its term dates from the semester instead of repeating them.',
      'Nothing has to belong to one. A Saturday dance class can stand on its own, and the filters along the top of the home screen and calendar flip between everything, one semester, or your standalone classes.',
    ],
    steps: ['Add and edit semesters in Settings, under Semesters.'],
    art: 'filters',
  },
  {
    id: 'archive',
    title: 'The archive',
    body: [
      'A class that has ended files itself away the morning after its last date, so the home screen stays about the term you are actually in. Archiving hides a class from the places that are about now, and touches no attendance at all.',
      'Everything archived lives in the Archive, grouped by term, and one tap brings it back. Archiving a semester takes its classes with it, and restoring hands them all back.',
    ],
    steps: [
      'Open the Archive from Settings, or from the line below your classes on the home screen.',
      'To file something away early, use Archive class in the class edit sheet, or the semester row in Settings.',
    ],
    art: 'archive',
  },
  {
    id: 'sync',
    title: 'Across your devices',
    body: [
      'Everything is written to your device first and backed up to your account, so the app works with no signal and catches up when it reconnects. Sign in anywhere and your classes and attendance are simply there.',
      'The dot at the top right shows where things stand. Tap it to see your sync status and push a sync on the spot, which is useful after a patchy connection.',
    ],
    art: 'sync',
  },
  {
    id: 'data',
    title: 'Your data',
    body: [
      'Attendance is worth being able to take with you, especially when something has to be raised with a department. Settings can export everything as JSON, or a single class as a CSV of its classes and how each one went.',
    ],
    steps: ['Open Settings, then Data, and choose an export.'],
    art: 'export',
  },
  {
    id: 'talk',
    title: 'Making Attend yours',
    body: [
      'Attend is built and maintained by one person, and Settings has a line straight to their desk. If something is broken, say so. If you want the app to do something it does not, say that. You do not have to be sure you are right.',
      'Your version and the device you are holding travel with the message, so you can describe what you saw and leave the rest alone.',
      'They read everything that comes in. Bugs tend to get dealt with first. Where there is a reply to give, it comes to the email you signed up with.',
      'Writing it offline is fine. The message waits on your device and sends itself the next time you have a connection.',
    ],
    steps: [
      'Open Settings and scroll to "Make Attend Yours".',
      'Choose whether it is something broken or an idea, then write as much or as little as you like.',
    ],
    art: 'message',
  },
];
