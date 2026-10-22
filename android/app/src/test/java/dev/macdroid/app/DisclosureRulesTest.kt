package dev.macdroid.app

import dev.macdroid.app.ui.disclosure.Disclosures
import dev.macdroid.app.ui.disclosure.Gated
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Google Play's prominent-disclosure rule (Plan 14): what, where and why, shown before Android's prompt, with an Agree. */
class DisclosureRulesTest {
    private fun text(g: Gated) = Disclosures.of(g).bullets.joinToString(" ")

    @Test fun everyGatedPermissionHasADisclosure() {
        for (g in Gated.entries) {
            val d = Disclosures.of(g)
            assertTrue(g.name, d.title.isNotBlank())
            assertTrue(g.name, d.bullets.size >= 2)
        }
    }

    @Test fun notificationsDisclosureSaysWhatWhereAndWhy() {
        val t = text(Gated.Notifications)
        assertTrue(t.contains("app, title, text and buttons"))
        assertTrue(t.contains("only to your paired Mac"))
        assertTrue(t.contains("Never to the internet"))
    }

    @Test fun accessibilityNeedsTheBoxTicked() {
        assertFalse(Disclosures.canAgree(Gated.Accessibility, checked = false))
        assertTrue(Disclosures.canAgree(Gated.Accessibility, checked = true))
        assertTrue(Disclosures.canAgree(Gated.Notifications, checked = false))
        assertEquals("I understand and allow Unison control", Disclosures.of(Gated.Accessibility).checkbox)
    }

    @Test fun accessibilityDisclosureIsExactlyTrue() {
        val t = text(Gated.Accessibility)
        assertTrue(t.contains("text box you're typing into"))
        assertTrue(t.contains("stays on the phone"))
        assertTrue(t.contains("Advanced Protection"))
        assertFalse(Regex("Start|screen-sharing").containsMatchIn(t))
    }

    // Final review: "records … nothing is recorded" contradicted itself; it captures and streams, it doesn't record.
    @Test fun microphoneDisclosureDoesNotSayRecord() {
        assertFalse(text(Gated.Microphone).contains("record", ignoreCase = true))
        assertTrue(text(Gated.Microphone).contains("only while you mirror"))
    }

    @Test fun agreeLabelsAreAffirmative() {
        assertEquals("Agree and open settings", Disclosures.of(Gated.Notifications).agreeLabel)
        assertEquals("Agree and open Accessibility", Disclosures.of(Gated.Accessibility).agreeLabel)
    }
}
