package dev.macdroid.app.ui.disclosure

/** The permissions Unison explains before Android asks (Google Play's prominent disclosure, Plan 14). */
enum class Gated { Notifications, Accessibility, Photos, Microphone, Calls }

data class Disclosure(val title: String, val bullets: List<String>, val agreeLabel: String, val checkbox: String? = null)

/** What each permission touches, where it goes and what it's for. The copy must stay exactly true to the code. */
object Disclosures {
    fun of(g: Gated): Disclosure = when (g) {
        Gated.Notifications -> Disclosure(
            title = "See phone notifications on your Mac",
            bullets = listOf(
                "What Unison reads: each notification's app, title, text and buttons.",
                "Where it goes: only to your paired Mac, encrypted, over your Wi-Fi. Never to the internet, and never to us.",
                "What for: reading, replying and clearing them from your Mac.",
            ),
            agreeLabel = "Agree and open settings",
        )
        Gated.Accessibility -> Disclosure(
            title = "Unison control uses the Accessibility service",
            bullets = listOf(
                "Unison uses Android's AccessibilityService API so your paired Mac can tap, scroll and type on this phone. This is optional, and Unison isn't an accessibility tool.",
                "What it uses: the clicks, scrolls and keys you send from your Mac's mirror window. To type, it reads the text box you're typing into so it can edit it. It doesn't read the rest of your screen or watch other apps.",
                "How it's used: only to carry out your own input from your Mac, only while you mirror this phone. It never acts on its own.",
                "Shared with: no one. Unison doesn't collect, store or send this data to us or anyone else. That text stays on the phone.",
                "You can turn it off any time in Android's Accessibility settings. Phones with Advanced Protection turned on don't allow this.",
            ),
            agreeLabel = "Agree and open Accessibility",
            checkbox = "I understand and allow Unison control",
        )
        Gated.Photos -> Disclosure(
            title = "See your photos on your Mac",
            bullets = listOf(
                "What Unison reads: your photos and videos, or just the ones you pick on the next screen.",
                "Where they go: only to your paired Mac, encrypted, over your Wi-Fi. Never to the internet, and never to us.",
                "What for: browsing and saving them from your Mac.",
            ),
            agreeLabel = "Agree and choose access",
        )
        Gated.Microphone -> Disclosure(
            title = "Hear your phone on your Mac",
            bullets = listOf(
                "Unison streams only the sound your phone is playing, and only while you mirror it.",
                "It goes only to your paired Mac, encrypted, over your Wi-Fi. Nothing is saved on either device.",
            ),
            agreeLabel = "Agree and allow",
        )
        Gated.Calls -> Disclosure(
            title = "Make calls from your Mac",
            bullets = listOf(
                "Your Mac can start a call through this phone when you dial or click a phone number there.",
                "The call itself, and its audio, stay on the phone. Unison keeps no call history.",
            ),
            agreeLabel = "Agree and allow",
        )
    }

    /** Unison control needs the box ticked as well as the button (affirmative consent). */
    fun canAgree(g: Gated, checked: Boolean): Boolean = of(g).checkbox == null || checked
}
