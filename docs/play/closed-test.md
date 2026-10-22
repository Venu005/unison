# Closed test checklist (personal developer account)

Google requires a closed test with **at least 12 testers opted in for 14 days in a row** before you can apply for production. Plan for at least 15 testers, so that one or two dropping out doesn't reset the count.

## Before the test starts
- [ ] Play Console → Create app: name "Unison", app (not game), free.
- [ ] Fill in App content: privacy policy, App access (`app-access.md`), ads (none), content rating, target audience, Data safety (`data-safety.md`), and the declarations (`declarations.md`) with their videos.
- [ ] Set up Play App Signing (default) and upload `app-release.aab` (`./gradlew :app:bundleRelease`) to **Closed testing** → create a track, for example "Friends".
- [ ] Add testers (an email list or a Google Group) and share the opt-in link. Each tester must open the link, accept, and install from Play.
- [ ] Tell testers they also need the free Mac app from https://venu005.github.io/unison/. Anyone without a Mac can still install, open the app and keep it installed, which helps count toward 12, but ask Mac users to really use it.

## During the 14 days
- [ ] Check Console → Testing → Closed testing → testers count every few days. Keep it at 12 or more.
- [ ] Ask testers to try:
  1. the guided tour from a fresh install (connect, photo, notifications, clipboard, Unison control);
  2. sending files both ways, including one large file;
  3. a phone call shown on the Mac;
  4. mirroring with sound, and controlling the phone from the Mac;
  5. leaving the phone overnight and checking it reconnects in the morning.
- [ ] Collect feedback (Play's tester feedback or a shared doc). Ship fixes to the same closed track: new uploads don't reset the 14 days.

## After 14 days
- [ ] Dashboard → **Apply for production**. Answer the questions about the test (how many testers, what feedback, what changed).
- [ ] Once production is approved, set `playUrl` in `website/site.config.js`, so the site's badge becomes a real link (a Plan 12 follow-up).
