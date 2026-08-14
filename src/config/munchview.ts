/**
 * Munchview's release status, in one place.
 *
 * The words "in closed testing" were written into five files — the lab card,
 * the about list, the app page's heading, its meta description, and the shared
 * video landing page. Each was true when written. On the day the app goes
 * public all five become false at once, and a status claim that outlives its
 * status is exactly what the studio rule forbids: a label has to be true of
 * what it sits next to.
 *
 * Five files is five chances to miss one. So: change `LIVE` here on launch day
 * and every surface follows. Nothing else needs editing.
 */

/** True once the app is on the public Play track, not the closed test. */
export const LIVE = false;

/** The Play listing. Correct whether the app is in testing or public. */
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.munchview.app';

/** Badge text: short, for the lab card and the about list. */
export const STATUS_BADGE = LIVE ? 'On Google Play' : 'In closed testing';

/** Sentence form, for prose and the about page's status line. */
export const STATUS_LINE = LIVE ? 'On Google Play' : 'In closed testing on Google Play';

/**
 * The clause that goes inside a meta description, lowercase and mid-sentence.
 * Kept separate because "Android, in closed testing." reads wrong capitalised.
 */
export const STATUS_CLAUSE = LIVE ? 'on Google Play' : 'in closed testing';

/** The line under a shared video, telling the reader where to get the app. */
export const SHARE_NOTE = LIVE
  ? 'Munchview is on Google Play —'
  : 'Munchview is in closed testing on Google Play —';
