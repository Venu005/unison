# Applying for production access

Play Console → Dashboard → **Apply for production**. The form has three parts. Each text box needs a real paragraph: Google rejects vague, one-line answers. Below are drafts to copy. Replace every `[[…]]` with your own facts, and keep the answers true. Reviewers can see your tester numbers.

Before you start, check: Testing → Closed testing shows **12 or more opted-in testers**, and the test ran for **14 days in a row**. The dashboard ticks confirm both.

---

## Part 1: About your closed test

### How easy was it to recruit testers for your app?
A choice from "Very easy" to "Very difficult". Pick what's true. If you had to ask around in groups and communities, **"Neither easy nor difficult"** or **"Difficult"** is a normal answer. It doesn't count against you.

### Describe the engagement you received from testers during your closed test
> I ran the closed test through a Google Group ("Unison Testers") with [[N]] testers. I recruited them from [[friends, colleagues, and online communities such as …]]. Unison connects an Android phone to a Mac, so I asked testers to install the free Mac app from the project website and pair it with their phone by QR code. I gave them a checklist: the guided setup tour, sending files both ways, mirrored notifications, the shared clipboard, calls on the Mac, screen mirroring and remote control, and checking the next morning that the phone reconnected overnight. Testers used phones from several makers ([[Nothing, Xiaomi, Samsung, Pixel …]]) and both Apple silicon and Intel Macs, and they reported back by email to the group.

### Provide a summary of the feedback that you received from testers. Include how you collected the feedback
> Testers sent feedback by email to the Google Group and through Play's private feedback. Highlights:
> - A tester on a Xiaomi 14 found that the "Notifications" tab label wrapped onto a second line, because of the phone's larger default font.
> - A tester found that dragging a file from Finder onto the Mac menu-bar window closed it before the drop.
> - Testers with Intel Macs asked for a Mac app that runs on their machines.
> - A tester couldn't scan the pairing QR code and found the "Can't scan?" link, which shows a manual pairing code, hard to click.
> - A tester asked to mute mirrored notifications for some apps (for example email they already get on the Mac), and asked why notifications show the Unison logo.
>
> Positive feedback included "I've installed and it appears to be working okay! This could be a killer app."

---

## Part 2: About your app

### Who is the intended audience of your app?
> People who use an Android phone together with a Mac and want them to work together the way an iPhone does with a Mac: students, developers, office workers and anyone who switches between the two devices all day. The app is for adults and teenagers, and has no content aimed at children.

### Describe how your app provides value to users
> Unison links an Android phone to a Mac over the local Wi-Fi network, with no account and no cloud. After pairing once by QR code, the user can see and reply to phone notifications on the Mac, share the clipboard, send files of any size both ways, browse phone photos from the Mac, take and make calls on the Mac, check battery level, and mirror and control the phone screen from the Mac. All traffic stays on the user's own network and is encrypted with mutual TLS. Nothing is uploaded to a server, and there are no ads or tracking. Android users on a Mac otherwise have no built-in way to do this.

### How many installs do you expect your app to have in your first year?
Pick a range. For a new free niche app, **"0 – 10K"** is realistic and safe.

---

## Part 3: Your app's production readiness

### What changes did you make to your app based on what you learned during your closed test?
> - Android 0.5.1: bottom-tab labels stay on one line and shrink to fit on phones with larger default fonts (the Xiaomi report).
> - Mac 0.4.2: files can be dropped straight onto the menu-bar icon, so a drag from Finder no longer closes the window first.
> - Mac 0.4.3: a universal build, so the companion app runs on Intel Macs as well as Apple silicon.
> - Mac 0.4.4: the whole "Can't scan?" row is now clickable, and each mirrored notification has a "Mute [app]" button (also on right-click in the app), so users can silence apps they already get on the Mac.
> - I also explained to testers that macOS always shows the posting app's logo; Unison adds the phone app's own icon as an image on each notification.
> - I shipped each fix to the closed track or the website during the test and confirmed it with the testers who reported the problem.

### How did you decide that your app is ready for production?
> Over the 14-day test, testers completed the full checklist on several phone brands, Android versions and Mac models. Every reported issue was fixed and released during the test, and no crashes or data-loss bugs were reported in Play Console's Android vitals [[check this is true before submitting]]. The app's core paths also have automated tests on both platforms, including a cross-platform test of the real Mac server against the real Android client. The permission declarations, the Data safety form and the privacy policy match what the app does, and the app works without any developer options or special setup.

---

## After you submit
- Google usually answers within about 7 days, by email and on the dashboard.
- If it's rejected, the email says why. Usually the fix is a longer closed test or more detailed answers. Fix that and apply again.
- If it's approved: Production → **Create new release** → **Add from library** (pick the newest closed-test bundle) or upload a new `.aab` with a higher `versionCode` → release notes → countries → a staged rollout (for example 20%) → **Send for review**. The release itself is then reviewed (often 1 to 3 days).
- Once it's live, set `playUrl` in `website/site.config.js` and update `docs/handoff/`.
