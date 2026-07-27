/**
 * Front door for deftday.com.
 *
 * The zone's API token can't write redirect rules, so the canonical-host
 * redirect lives here instead: www is sent to the apex with a 301, and
 * everything else falls through to the static assets.
 */
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const CANONICAL_HOST = 'deftday.com';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === `www.${CANONICAL_HOST}`) {
      url.hostname = CANONICAL_HOST;
      return Response.redirect(url.toString(), 301);
    }

    return env.ASSETS.fetch(request);
  },
};
