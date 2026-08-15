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
 * The Google OAuth WEB client, for "Continue with Google" on munchview.app.
 *
 * A separate client from the app's, and it has to be: the app's is an ANDROID
 * client, bound to a package name and a signing certificate, and Google
 * refuses one from a browser — no authorised JavaScript origin, so the dialog
 * fails before a person sees it. This one is type "Web application" with
 * munchview.app and www.munchview.app as its origins.
 *
 * Committed rather than read from a build variable, and that is deliberate.
 * An OAuth client id is not a secret — Google Identity Services needs it in
 * the page, so it is served in the HTML to every visitor, and the app's
 * Android id has always shipped inside the APK the same way. Keeping it out
 * of git would hide it from nobody while adding a real failure: a clean
 * checkout builds with the variable unset, GOOGLE_READY goes false, and
 * sign-in quietly reverts to the fallback with nothing to show why.
 *
 * The client SECRET is a different thing entirely and is not here, not in
 * this repo, and not needed — this flow never uses one.
 *
 * Paired with the content Worker's GOOGLE_CLIENT_IDS secret, which is the
 * audience list /sync verifies an ID token against. Both hold this id; a
 * token minted for a client the Worker has never heard of is refused, which
 * is correct and looks exactly like "sign-in does nothing".
 */
export const GOOGLE_WEB_CLIENT_ID =
  import.meta.env.PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '1011416955629-85ce14n62dk5n6fmjsnd2be6bmu4ltbh.apps.googleusercontent.com';

/**
 * True once a web client exists and "Continue with Google" can actually work.
 *
 * The intended door, and the same one the app uses. Until the id is set the
 * page falls back to pairing with the phone — which needs no Google client at
 * all — so nobody is locked out while this is empty.
 */
export const GOOGLE_READY = GOOGLE_WEB_CLIENT_ID.length > 0;

/**
 * True when the web can complete a sign-in.
 *
 * Now always true: pairing with the phone needs no Google client, so the flag
 * that used to gate an unbuildable button gates nothing. Kept as the single
 * place the pages ask the question, because there is still a version of the
 * answer that is "no" — a deployment with no content API to pair against.
 */
export const SIGN_IN_READY = true;

/** Where the browser starts a pairing, and where it later reads the record. */
export const CONTENT_API_URL = 'https://munchview-content.bsaygin.workers.dev';

/** Where a signed-in reader lands. Served by the Next.js app. */
export const APP_PATH = '/app';
