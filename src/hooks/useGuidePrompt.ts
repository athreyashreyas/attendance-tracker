import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAllCourses } from './useCourses';
import { APP_VERSION } from '../lib/changelog';
import { getSeenVersion, isNewerVersion } from '../lib/whatsNew';

/**
 * Opens the guide on its own at the two moments it earns the interruption.
 *
 * Someone opening Attend for the first time gets the walk-through, so they
 * start knowing what the app is for rather than staring at an empty screen.
 * Someone who has been using it and opens a new version gets What's new. After
 * that the guide waits quietly in Settings.
 *
 * "First time" is read from the device marker plus whether the account has any
 * classes yet: a returning user signing in on a new phone has classes already,
 * so they get What's new, not a walk-through they have read before.
 *
 * Both panes are one tap from each other, so a wrong guess costs nothing.
 */
export function useGuidePrompt(): void {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: courses, isLoading } = useAllCourses();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || isLoading || !courses) return;
    // Don't pull anyone off the guide itself, or out of the middle of marking.
    if (location.pathname.startsWith('/guide')) return;

    const seen = getSeenVersion();
    if (!isNewerVersion(APP_VERSION, seen)) {
      handled.current = true;
      return;
    }

    handled.current = true;
    // Nothing recorded yet and nothing to show for it: this is someone's first
    // time in the app, so walk them through it. Everyone else has been using
    // Attend already, and wants to know what changed.
    const brandNew = seen === null && courses.length === 0;
    navigate(brandNew ? '/guide?pane=guide&first=1' : '/guide?pane=new', {
      replace: true,
    });
  }, [courses, isLoading, location.pathname, navigate]);
}
