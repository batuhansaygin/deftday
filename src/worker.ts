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
    const wrongHost = url.hostname === `www.${CANONICAL_HOST}`;

    if (wrongScheme || wrongHost) {
      url.protocol = 'https:';
      if (wrongHost) url.hostname = CANONICAL_HOST;
      return new Response(null, {
        status: 301,
        headers: {
          Location: url.toString(),
          'Strict-Transport-Security': HSTS,
        },
      });
    }

    let response: Response;
    try {
      response = await env.ASSETS.fetch(request);
    } catch (err) {
      logError(env, 'assets-fetch-failed', String(err));
      throw err;
    }
    const headers = new Headers(response.headers);
    headers.set('Strict-Transport-Security', HSTS);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
