# assetlinks.json — what it is and what is still missing

`assetlinks.json` is how deftday.com tells Android that Munchview is allowed to
open its own links. With it, a shared
`https://deftday.com/munchview/v?u=…` opens the app directly instead of the
landing page with an "Open in Munchview" button.

Android fetches it over HTTPS at `/.well-known/assetlinks.json`, so it must stay
at exactly that path, be served as JSON, and never redirect.

## The fingerprint that is in it

`F6:89:…:3D:B1` is the **upload key**. That is the key that signs the builds on
build.deftday.com, so side-loaded installs verify against this file today.

## The fingerprint that is NOT in it yet

Google Play re-signs every app with its own **app signing key**, so a build
installed from Play has a different certificate and will not verify against the
list above. Until its fingerprint is added here, a shared link opens the landing
page for Play users — which works, and is one tap longer than it needs to be.

To finish it:

1. Play Console → your app → **Test and release → Setup → App integrity**
2. Under **App signing key certificate**, copy the **SHA-256 certificate
   fingerprint**
3. Add it to the `sha256_cert_fingerprints` array here — both fingerprints stay,
   the array is a list on purpose
4. Deploy the site, then check
   `https://deftday.com/.well-known/assetlinks.json` returns both
5. Reinstall the app from Play; Android re-verifies on install. `adb shell pm
   get-app-links com.munchview.app` shows the verdict.

Play Console also offers this file ready-made under **App integrity → Deep
links**, if you would rather copy it than edit it by hand.
