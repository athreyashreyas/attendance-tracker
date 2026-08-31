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
  | 'timetable'
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
  /**
   * One line saying what is inside, shown on the folded row. It is all a
   * reader sees of a folded section, so it has to earn the tap on its own.
   * The opening sections are already open and need none.
   */
  summary?: string;
  body: string[];
  /** Short, followable steps. Skip them where the prose already suffices. */
  steps?: string[];
  art?: GuideArtKind;
  /** Part of the opening read, shown in full. See the note below. */
  essential?: boolean;
}

/**
 * The guide, in two parts.
 *
 * The first five sections are the opening read: what Attend is, setting a class
 * up, marking, where you stand, and the calendar. They are shown in full, and
 * they are the whole of what somebody needs before they start.
 *
 * Everything after them is folded away behind a one-line summary, opened only
 * by someone who wants it. **A new feature belongs there, not in the opening
 * read.** This is the screen a person meets before they have used the app at
 * all, and it is worth reading only while it stays short: five short pieces,
 * then a list of titles.
 *
 * Two paragraphs and three steps is the shape of a section. Anything needing
 * more than that is usually a sign the screen itself should be doing the
 * explaining.
 */
export const GUIDE: GuideSection[] = [
  {
    id: 'idea',
    title: 'The idea',
    essential: true,
    body: [
      'Attend keeps a record of the classes you turn up to, and answers the question behind it: how many more can I miss?',
      'You set each class up once, with the days it meets and the attendance you need to hold. After that it is two taps a day, and everything else is reading.',
    ],
    art: 'ring',
  },
  {
    id: 'classes',
    title: 'Setting up a class',
    essential: true,
    body: [
      'A class carries its own days of the week, its own colour, its own first and last date, and the minimum attendance you have to hold.',
      'The dates are worth a moment. With them, Attend knows how many classes are still to come, so it can tell you what you can afford to miss for the rest of the term rather than only where you stand today.',
    ],
    steps: [
      'Tap + on the home screen, name the class, and pick the weekdays it meets.',
      'Set the first and last class, and the attendance you need.',
      'Open Days off to take out the holidays you already know about.',
    ],
    art: 'schedule',
  },
  {
    id: 'marking',
    title: 'Marking your day',
    essential: true,
    body: [
      'The Mark tab deals today\'s classes one card at a time: present, absent, or cancelled. Once the day is done it steps aside rather than offering to mark anything twice.',
      'While something is still unmarked, the home screen carries a banner counting what is genuinely left. Forgetting a day is no trouble. Open the calendar whenever you remember and mark it then.',
    ],
    steps: [
      'Tap the banner on the home screen, or the Mark tab.',
      'Swipe back through the cards to change something you have just marked.',
      'A class marked cancelled sits outside your percentage entirely.',
    ],
    art: 'mark',
  },
  {
    id: 'class-page',
    title: 'Where you stand',
    essential: true,
    body: [
      'Open a class and the ring shows where you are against your threshold, with the plain numbers beside it. Underneath is the sentence that matters: how many more you can miss, or how many you need in a row to climb back.',
      'The grid at the bottom is the term day by day. Filled is present, muted is absent, struck through is cancelled, and a hollow square is a day the class was taken off.',
    ],
    steps: [
      'Tap any square on the grid to record or change that day.',
      'Use the filters above the class list to pull up only the absences, or only what was cancelled.',
    ],
    art: 'grid',
  },
  {
    id: 'calendar',
    title: 'The calendar',
    essential: true,
    body: [
      'The calendar is the whole picture: a filled dot for a class you have marked, a hollow one for a class still to come. Tap any day to see what it holds and to record it.',
      'A day can also take a class it does not usually have, for the extra lecture that lands out of nowhere.',
    ],
    steps: [
      'Tap a day, then tap any class on it to record or change it.',
      'Use "Add an extra class" to put a one-off on that day.',
      'The filter along the top narrows everything to one semester.',
    ],
    art: 'calendar',
  },

  // Everything below is folded away by default. New features go here.
  {
    id: 'breaks',
    title: 'Days off and breaks',
    summary: 'Holidays you know about, and classes called off later.',
    body: [
      'There are two ways to lose a class, and they mean different things. A day off is taken out of the schedule before it happens: it never becomes a class, and it never touches your percentage. A cancellation is a class that was going to run and did not, recorded as cancelled and left out of the totals.',
      'Set days off on the class when you have the term calendar in advance. Cancel from the calendar when something is called off later.',
    ],
    steps: [
      'Days off: open the class, expand Days off, and tap the dates. "A whole break" takes out a run of them in two taps.',
      'Cancelling: on the Calendar, tap the crossed-out calendar at the top right, then choose the days and the classes.',
      'Anything you have already marked is left exactly as it is.',
    ],
    art: 'daysoff',
  },
  {
    id: 'double-days',
    title: 'More than one class a day',
    summary: 'A double lecture is two classes, marked one at a time.',
    body: [
      'Some days hold a class twice: a double lecture, a lab that runs two periods, a tutorial straight after the theory hour. Each one is its own class with its own attendance, so missing the second half is a single absence rather than a whole day.',
      'Set it on the class and it repeats every week. For a one-off extra, add it to the day from the calendar instead.',
    ],
    steps: [
      'In the class, under Class days, open "More than one class a day" and raise the count for that weekday.',
      'Marking then asks for each one in turn: the 1st of 2, then the 2nd.',
    ],
    art: 'double',
  },
  {
    id: 'timetable-changes',
    title: 'When your class days change',
    summary: 'The days move partway through the term, and the weeks before stay as they were.',
    body: [
      'A class does not always keep the days it started with. When yours moves, set the new days and give Attend the date they started. The weeks before that date keep the days they actually ran on, and every class you marked on them stays exactly where it is.',
      'Attend asks, because the same edit can mean two things. If the days moved, the change begins on a date. If they were simply typed in wrongly to begin with, choose "It has always been..." and the whole term is put right at once.',
    ],
    steps: [
      'Open the class, tap the pencil at the top right, and set the new days.',
      'Tap "Save changes", pick the date the new days started, and choose "Save the change".',
      'The class page then lists the days before and after. Tap a run of weeks there to correct it or undo it.',
    ],
    art: 'timetable',
  },
  {
    id: 'semesters',
    title: 'Semesters and standalone classes',
    summary: 'Group a term\'s classes together, or let one stand on its own.',
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
    summary: 'Finished terms step aside on their own, and nothing is lost.',
    body: [
      'A class files itself away the morning after its last date, so the home screen stays about the term you are actually in. Nothing is deleted and no attendance is touched.',
      'Everything archived lives in the Archive, grouped by term, and one tap brings it back. Archiving a semester takes its classes with it, and restoring hands them all back.',
    ],
    steps: [
      'Open the Archive from Settings, or from the line below your classes on the home screen.',
      'To file something away early, use Archive class in the class edit sheet.',
    ],
    art: 'archive',
  },
  {
    id: 'sync',
    title: 'Across your devices',
    summary: 'Works with no signal, and is the same on your phone and your iPad.',
    body: [
      'Everything is written to your device first and backed up to your account, so the app works with no signal at all and catches up when it reconnects. Sign in anywhere and your classes and your attendance are simply there.',
      'The dot at the top right shows where things stand. Tap it for your sync status, or to push a sync yourself after a patchy connection.',
    ],
    art: 'sync',
  },
  {
    id: 'data',
    title: 'Your data',
    summary: 'Take the whole record with you whenever you need it.',
    body: [
      'Your attendance is worth being able to take with you, especially when something has to be raised with a department. Attend can hand you everything as a JSON file, or a single class as a CSV listing its classes and how each one went.',
    ],
    steps: ['Open Settings, then Data, and choose an export.'],
    art: 'export',
  },
  {
    id: 'talk',
    title: 'Making Attend yours',
    summary: 'A line straight to the person who makes it.',
    body: [
      'Attend is built and looked after by one person, and Settings has a line straight to their desk. If something is broken, say so. If you want the app to do something it does not do, say that. You do not have to be sure you are right.',
      'Everything that comes in is read, and bugs tend to be dealt with first. Where there is a reply to give, it comes to the email you signed up with. Writing it offline is fine: the message waits on your device and sends itself the next time you have a connection.',
    ],
    steps: [
      'Open Settings and scroll to "Make Attend Yours".',
      'Choose whether it is something broken or an idea, then write as much or as little as you like.',
    ],
    art: 'message',
  },
];

/** The opening read: shown in full, and kept short on purpose. */
export const GUIDE_ESSENTIALS = GUIDE.filter((s) => s.essential);

/** The rest, folded behind their summaries until somebody wants them. */
export const GUIDE_MORE = GUIDE.filter((s) => !s.essential);
