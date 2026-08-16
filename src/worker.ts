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
  /**
   * A shared password in front of /watch while the web app is being finished.
   *
   * Not a login and not pretending to be one: it is a door held shut so people
   * who install the Android app do not wander into a half-built web version
   * and judge the product by it. Unset means the door is open, which is what
   * the day this is finished looks like.
   */
  WATCH_PASSWORD?: string;
  /** The studio error log's D1 (log.deftday.com). */
  ERRORS_DB?: D1Database;
}

/** The cookie's name and the string the secret is signed over. */
const GATE_COOKIE = 'mv_gate';
const GATE_MESSAGE = 'munchview-watch-gate-v1';

/** Hex of HMAC(secret, message) — deterministic, so the gate holds no state. */
async function gateToken(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(GATE_MESSAGE));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant time: a compare that stops at the first wrong byte is a hint. */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cookieValue(header: string | null, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

/**
 * The door in front of the web app while it is being finished.
 *
 * Server side on purpose. A check in the page would be two clicks to defeat
 * and would look like security without being any — and the point here is that
 * the half-built version is genuinely not reachable, not that it is hidden.
 *
 * Returns a response when the request should NOT reach the app, and null when
 * it should. With no password configured it returns null always, so removing
 * the secret is how this is switched off.
 */
async function watchGate(request: Request, env: Env, url: URL): Promise<Response | null> {
  const secret = env.WATCH_PASSWORD;
  if (!secret) return null;

  const expected = await gateToken(secret);

  if (request.method === 'POST' && url.pathname === '/watch/__gate') {
    const form = await request.formData().catch(() => null);
    const given = String(form?.get('password') ?? '');
    if (!sameString(given, secret)) {
      return gatePage('wrong');
    }
    return new Response(null, {
      status: 303,
      headers: {
        location: '/watch',
        /* HttpOnly so no script can read it, Secure so it never crosses
           plaintext, Lax so a link from elsewhere still works, scoped to
           /watch so nothing else on the host ever receives it. */
        'set-cookie': `${GATE_COOKIE}=${expected}; Path=/watch; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  }

  const held = cookieValue(request.headers.get('cookie'), GATE_COOKIE);
  if (held != null && sameString(held, expected)) return null;
  return gatePage(null);
}

/** One field, no branding beyond the mark — it is a door, not a page. */
function gatePage(state: 'wrong' | null): Response {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Munchview</title><meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#0E101A">
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#0E101A;color:#EEF2F6;
font:16px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:32px}
form{width:min(100%,340px);text-align:center;display:flex;flex-direction:column;gap:14px}
svg{margin:0 auto 6px}
h1{margin:0;font-size:20px;letter-spacing:-.01em}
p{margin:0;color:#8D949B;font-size:14px}
input{background:#181B26;border:1px solid #222633;color:#EEF2F6;border-radius:10px;height:46px;
padding:0 14px;font:inherit;font-size:15px}
input:focus{border-color:#FFB300;outline:none}
button{background:#FFB300;color:#1A1200;border:0;border-radius:100px;min-height:46px;
font:inherit;font-weight:800;font-size:15px;cursor:pointer}
.err{color:#FFB300;font-size:13.5px}
a{color:#8D949B;font-size:13.5px}
</style></head><body>
<form method="POST" action="/watch/__gate">
<svg width="34" height="34" viewBox="0 0 1024 1024" aria-hidden="true">
<mask id="b"><rect width="1024" height="1024" fill="#fff"/><circle cx="586" cy="390" r="80" fill="#000"/></mask>
<g mask="url(#b)"><path d="M438 341 L632 459 Q700 500 632 541 L438 659 Q370 700 370 620 L370 380 Q370 300 438 341 Z" fill="#FFB300"/></g>
<circle cx="648" cy="288" r="18" fill="#FFB300"/><circle cx="700" cy="345" r="11" fill="#FFB300"/></svg>
<h1>Munchview on the web</h1>
<p>Still being built. The Android app is the one to use.</p>
<input name="password" type="password" autocomplete="current-password" autofocus
 aria-label="Password" placeholder="Password">
${state === 'wrong' ? '<p class="err">That is not it.</p>' : ''}
<button type="submit">Continue</button>
<a href="https://play.google.com/store/apps/details?id=com.munchview.app">Get the Android app</a>
</form></body></html>`;
  return new Response(body, {
    status: state === 'wrong' ? 401 : 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
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
    /* Google's endpoint and the content service — the latter for both the
       token exchange and the email/password routes, which post here too. */
    "connect-src 'self' https://accounts.google.com https://content.deftday.com; " +
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
    /**
     * munchview.app/privacy and /terms belong to MUNCHVIEW, not the studio.
     *
     * They resolved to the studio-wide pages, because the lookup tries
     * /munchview-app/<path> first and falls back to the plain path — and the
     * plain /privacy is DeftDay's. So somebody on munchview.app who went to
     * /privacy got a policy that says nothing about this app: no YouTube API
     * Services disclosure, no per-platform detail, and a canonical pointing
     * at deftday.com/privacy. Found on 2026-08-16 while choosing which URL to
     * give YouTube's compliance audit, where that disclosure is a checked
     * item.
     *
     * Redirected rather than rewritten, unlike the rest of this host: the
     * Munchview policy already declares deftday.com/munchview/privacy as its
     * canonical, and it is the address the app, the store listing and the
     * data-safety document all use. One policy, one URL.
     */
    /* /kvkk was the Turkish data-protection notice until 2026-08-16, when the
       site moved to English throughout and it was replaced by /gdpr. Kept as a
       redirect rather than deleted: a link that 404s is worse than one that
       moves, and this one was in the footer of every page for weeks. */
    if (url.pathname === '/kvkk' || url.pathname.startsWith('/kvkk/')) {
      return Response.redirect(`https://${CANONICAL_HOST}/gdpr`, 301);
    }

    if (url.hostname === APP_HOST && (url.pathname === '/privacy' || url.pathname === '/terms')) {
      return Response.redirect(`https://${CANONICAL_HOST}/munchview${url.pathname}`, 301);
    }

    if (url.hostname === APP_HOST && (url.pathname === '/watch' || url.pathname.startsWith('/watch/'))) {
      const gate = await watchGate(request, env, url);
      if (gate != null) return gate;
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
