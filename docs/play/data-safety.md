# Data safety (App content → Data safety)

**Basis:**
- Unison has no server and no analytics, and the developer receives nothing.
- Data moves only between the user's own phone and their own paired Mac, over mutual TLS 1.3 with keys that exist only on those two devices.
- Google's form treats data sent with end-to-end encryption, where the developer can't read it, as not "collected" and not "shared". See [Google Play: Data safety](https://support.google.com/googleplay/answer/11416267).
- Since Plan 14 the app has no ML Kit and no Google datatransport. `NoTelemetryTest` fails if either comes back.

## Answers
1. **Does your app collect or share any of the required user data types?** **No.**
2. **Is all of the user data collected by your app encrypted in transit?** Play only asks this if you answered Yes. If the form shows it anyway: **Yes**.
3. **Do you provide a way for users to request that their data is deleted?** Play only asks this if you answered Yes. If asked: data exists only on the user's devices. Forgetting the Mac in the app, or uninstalling, removes it.
4. **Privacy policy:** https://venu005.github.io/unison/privacy/

## Checks before submitting
- Run `cd android && ./gradlew :app:dependencies --configuration releaseRuntimeClasspath | grep -iE "mlkit|datatransport|firebase|analytics|crashlytics"`. Expected: no output.
- Make sure the privacy page still describes what each permission is for (notifications, photos, microphone, accessibility, calls, camera).

## Fallback (if `photos-fallback.md` is applied)
The answers don't change, because photos never left the user's devices. Just remove photos from the privacy page's permission list.
