/**
 * Front door for deftday.com.
 *
 * The zone's API token can't write redirect rules or SSL settings, so the two
 * things "Always Use HTTPS" and a redirect rule would normally do live here:
 * plain HTTP is sent to HTTPS, and www is sent to the apex. Everything else
 * falls through to the static assets, with HSTS added on the way out.
 */
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  /** munchview.app/watch — the signed-in Next.js app, in its own Worker. */
  WEB: { fetch(request: Request): Promise<Response> };
  /** The studio error log's D1 (log.deftday.com). */
  ERRORS_DB?: D1Database;
}

/** Report an error to the studio log — errors only, no IPs, fire-and-forget. */
function logError(env: Env, event: string, message: string) {
  try {
    env.ERRORS_DB?.prepare(
      'INSERT INTO events (ts, app, level, event, message, stack, country, meta) VALUES (?,?,?,?,?,?,?,?)',
    )
      .bind(Date.now(), 'site', 'error', event.slice(0, 64), String(message ?? '').slice(0, 2048), '', '', '')
      .run()
      .catch(() => {});
  } catch {
    // Logging is a bystander, never a participant.
  }
}

const CANONICAL_HOST = 'deftday.com';
/**
 * The app's own domain, bought 2026-08-15, served by this same Worker.
 *
 * A second Worker would mean a second deploy to forget — and the six days of
 * site changes that sat unpublished in August were exactly that class of
 * mistake. One Worker, one deploy, and the hostname decides which front door
 * the visitor gets: munchview.app is rewritten onto /munchview-app/, which is
 * a normal page in this project and builds with everything else.
 *
 * Only the ROOT is rewritten. Deeper paths are left alone so the shared-video
 * links, the privacy page and everything else keep resolving where they
 * always have, and so a future /press or /help under munchview.app is a file
 * rather than another branch here.
 */
const APP_HOST = 'munchview.app';
/* No trailing slash: this project builds with Astro's `file` format, so the
   page is dist/munchview-app.html and the assets handler resolves the
   extension-less path onto it. A trailing slash looks for a directory that
   does not exist and 404s. */
const APP_ROOT = '/munchview-app';

const CSP_BASE_NO_STYLE =
  "default-src 'self'; font-src 'self'; " +
  "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests";

const CSP_BASE = `style-src 'self' 'unsafe-inline'; ${CSP_BASE_NO_STYLE}`;

/**
 * Per-page policies for munchview.app. Keyed by the PUBLIC path, because that
 * is what the request carries — the rewrite to /munchview-app/... happens
 * after this map is read.
 */
const CSP_BY_PATH: Record<string, string> = {
  /* Google Identity Services: its script, the iframe it draws the button in,
     and the endpoint it posts the credential to. Nothing else is added, and
     the avatar host is there because the button shows one. */
  '/signin':
    "script-src 'self' 'unsafe-inline' https://accounts.google.com; " +
    /* GIS pulls its own stylesheet for the button. Without this the button
       draws and comes out unstyled — which is worse than not drawing, because
       it looks like a broken page rather than a missing feature. */
    "style-src 'self' 'unsafe-inline' https://accounts.google.com; " +
    "img-src 'self' data: https://*.googleusercontent.com; " +
    /* Google's endpoint AND the content service. The page trades Google's
       credential for a session of ours the moment the button returns, and the
       first version of this list had only Google in it — so the browser
       blocked that exchange and the card said "Signed in with Google, but
       Munchview could not finish it", which was exactly true and gave no way
       to know why (reported 2026-08-15). A CSP has to list what a page calls,
       not what it used to call. */
    "connect-src 'self' https://accounts.google.com https://munchview-content.bsaygin.workers.dev; " +
    'frame-src https://accounts.google.com; ' +
    CSP_BASE_NO_STYLE,
};
const HSTS = 'max-age=31536000; includeSubDomains';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    /* Behind Cloudflare the client's real scheme arrives in cf-visitor;
       request.url can already read https even when the visitor used http. */
    const visitorScheme = (() => {
      const header = request.headers.get('cf-visitor');
      if (!header) return url.protocol.replace(':', '');
      try {
        return JSON.parse(header).scheme as string;
      } catch {
        return url.protocol.replace(':', '');
      }
    })();

    const wrongScheme = visitorScheme === 'http';
    const wrongHost =
      url.hostname === `www.${CANONICAL_HOST}` || url.hostname === `www.${APP_HOST}`;

    if (wrongScheme || wrongHost) {
      url.protocol = 'https:';
      if (url.hostname === `www.${CANONICAL_HOST}`) url.hostname = CANONICAL_HOST;
      if (url.hostname === `www.${APP_HOST}`) url.hostname = APP_HOST;
      return new Response(null, {
        status: 301,
        headers: {
          Location: url.toString(),
          'Strict-Transport-Security': HSTS,
        },
      });
    }

    /**
     * Two hostnames, one Worker, and the crawler files have to tell them
     * apart.
     *
     * `public/robots.txt` names deftday.com's sitemap. Served unchanged on
     * munchview.app it would point crawlers at another site's index and offer
     * none of its own — so the app domain gets its own, written here rather
     * than as a second file, because a second file is a second thing to
     * forget when the first one changes.
     *
     * The sitemap lists only what munchview.app actually serves. Astro's
     * generated sitemap-index is deftday.com's and stays there.
     */
    if (url.hostname === APP_HOST) {
      if (url.pathname === '/robots.txt') {
        return new Response(
          `User-agent: *\nAllow: /\nDisallow: /app/\n\nSitemap: https://${APP_HOST}/sitemap.xml\n`,
          { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } },
        );
      }
      if (url.pathname === '/sitemap.xml') {
        const urls = [`https://${APP_HOST}/`];
        const body =
          '<?xml version="1.0" encoding="UTF-8"?>' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
          urls.map((u) => `<url><loc>${u}</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`).join('') +
          '</urlset>';
        return new Response(body, {
          headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
        });
      }
    }

    /* munchview.app's root is the app's page, not the studio's. Rewritten
       rather than redirected: the visitor asked for munchview.app and should
       stay on it. */
    /**
     * munchview.app's pages live in the munchview-app folder; its ASSETS do
     * not.
     *
     * Prefixing every path blindly breaks the images, which are shared with
     * deftday.com and sit at /munchview/... — prefixed, they become
     * /munchview-app/munchview/... and 404. So the folder is TRIED first and
     * the plain path is the fallback. One extra lookup on a miss, against an
     * edge cache, and no list of exceptions to keep in step with the files.
     */
    /**
     * The signed-in application. Forwarded whole, before any asset lookup:
     * it owns its own routing, its own headers and its own caching, and an
     * Assets miss here would answer with this site's 404 rather than its.
     */
    if (url.hostname === APP_HOST && (url.pathname === '/watch' || url.pathname.startsWith('/watch/'))) {
      const app = await env.WEB.fetch(request);
      /**
       * The app's HTML shell must never be cached at the edge.
       *
       * It arrived with `s-maxage=31536000` — a year — because Next prerenders
       * it and OpenNext caches prerendered routes hard. For a document that
       * boots a client application that is exactly wrong: every deploy became
       * invisible to anyone whose edge already held a copy, and two rounds of
       * fixes were reported as "still the same" while the new bundle sat there
       * unreferenced (2026-08-15).
       *
       * Only the document. Everything under /watch/_next/static is content
       * hashed and keeps whatever long life it was given.
       */
      const type = app.headers.get('content-type') ?? '';
      if (!type.includes('text/html')) return app;
      const headers = new Headers(app.headers);
      headers.set('cache-control', 'no-store, must-revalidate');
      return new Response(app.body, { status: app.status, statusText: app.statusText, headers });
    }

    let response: Response;
    try {
      if (url.hostname === APP_HOST) {
        const inFolder = new URL(url);
        inFolder.pathname =
          url.pathname === '/' || url.pathname === '' ? APP_ROOT : `${APP_ROOT}${url.pathname}`;
        response = await env.ASSETS.fetch(new Request(inFolder, request));
        if (response.status === 404) response = await env.ASSETS.fetch(request);
      } else {
        response = await env.ASSETS.fetch(request);
      }
    } catch (err) {
      logError(env, 'assets-fetch-failed', String(err));
      throw err;
    }
    const headers = new Headers(response.headers);
    headers.set('Strict-Transport-Security', HSTS);
    /**
     * The two munchview.app pages that must reach something other than this
     * origin, given their policy HERE rather than in public/_headers.
     *
     * _headers appends, it does not replace — and a browser handed two
     * Content-Security-Policy headers enforces the INTERSECTION of both, so
     * the site-wide policy went on blocking Google's sign-in script no matter
     * what the second one allowed. The button rendered nowhere and said
     * nothing (reported 2026-08-15). `set` here overwrites, which is the only
     * way to actually loosen a policy for one page.
     *
     * deftday.com is untouched: it keeps the tighter site-wide policy from
     * _headers, and these two paths only exist under munchview.app.
     */
    const csp = CSP_BY_PATH[url.pathname];
    if (csp != null && url.hostname === APP_HOST) headers.set('Content-Security-Policy', csp);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
