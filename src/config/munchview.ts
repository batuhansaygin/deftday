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

/**
 * The app's own site, bought 2026-08-15.
 *
 * Here rather than typed into each page for the usual reason this file exists,
 * and for one more: the two sites link to each other on purpose. Search engines
 * read that as two related properties rather than one site and a stranger, and
 * a constant is what stops half the links going stale the day anything moves.
 */
export const SITE_URL = 'https://munchview.app';

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

/*
 * Deploying this site
 * -------------------
 * `npx wrangler deploy` — it is a Worker (see wrangler.jsonc), not a Pages
 * project. `wrangler pages deploy` appears to succeed, reports a Production
 * deployment on main, and publishes to an unrelated `deftday` Pages project
 * that nothing points at. Six days of changes sat unpublished that way before
 * anyone noticed, on 2026-08-14, because the pages.dev URL served the new build
 * and deftday.com served the old one.
 */

/**
 * The Google OAuth WEB client, for signing in on munchview.app.
 *
 * The app signs in with an ANDROID client (expo-auth-session), and an Android
 * client cannot be used from a browser — Google binds it to a package name and
 * a signing certificate. Signing in on the web needs its own client, created
 * in the Google Cloud console; there is no API for it.
 *
 * Read from the build environment rather than hard-coded so the value can
 * arrive without a code change:
 *
 *   PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com npx astro build
 *
 * Two things have to happen together on the day it is set:
 *   1. this variable, and
 *   2. the same id appended to the content Worker's GOOGLE_CLIENT_IDS secret,
 *      which is the list /sync verifies an ID token's audience against. A
 *      token minted for a client the Worker does not know is refused, which is
 *      the correct behaviour and would look like "sign-in does nothing".
 *
 * Until then `SIGN_IN_READY` is false and the pages keep the install CTA. A
 * button that opens a Google dialog which then fails is worse than no button.
 */
export const GOOGLE_WEB_CLIENT_ID = import.meta.env.PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

/** True when the web can actually complete a sign-in. */
export const SIGN_IN_READY = GOOGLE_WEB_CLIENT_ID.length > 0;

/** Where a signed-in reader lands. Served by the Next.js app. */
export const APP_PATH = '/app';
