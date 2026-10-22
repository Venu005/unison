package dev.macdroid.app

import dev.macdroid.app.platform.mirror.MirrorConsentRules
import dev.macdroid.app.platform.mirror.MirrorConsentRules.Start
import dev.macdroid.app.ui.PromptRules
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Final review fixes (Plan 14): no dead ends after "Don't allow", no invisible screen on rotation, notifications asked once. */
class PromptRulesTest {
    // I2: Android stops showing a prompt after it was denied twice; then the only way on is the app's settings.
    @Test fun deniedForGoodOpensSettings() {
        assertTrue(PromptRules.openSettingsAfter(granted = false, canAskAgain = false))
        assertFalse(PromptRules.openSettingsAfter(granted = false, canAskAgain = true))
        assertFalse(PromptRules.openSettingsAfter(granted = true, canAskAgain = false))
    }

    // I3: the microphone sheet comes back after rotation instead of leaving an invisible screen.
    @Test fun mirrorConsentShowsTheSheetAgainAfterRecreation() {
        assertEquals(Start.Sheet, MirrorConsentRules.onCreate(restored = false, sheetShowing = false, wantsAudio = true, hasMicrophone = false))
        assertEquals(Start.Capture, MirrorConsentRules.onCreate(restored = false, sheetShowing = false, wantsAudio = true, hasMicrophone = true))
        assertEquals(Start.Capture, MirrorConsentRules.onCreate(restored = false, sheetShowing = false, wantsAudio = false, hasMicrophone = false))
        assertEquals(Start.Sheet, MirrorConsentRules.onCreate(restored = true, sheetShowing = true, wantsAudio = true, hasMicrophone = false))
        // A system prompt was up: its result still arrives, so nothing to redo.
        assertEquals(Start.Nothing, MirrorConsentRules.onCreate(restored = true, sheetShowing = false, wantsAudio = true, hasMicrophone = false))
    }

    // I5: "post notifications" is asked once after connecting, so mirror requests and the connection notice can show.
    @Test fun postNotificationsIsAskedOnceAfterConnecting() {
        assertTrue(PromptRules.askToPostNotifications(connected = true, needs = true, has = false, askedBefore = false))
        assertFalse(PromptRules.askToPostNotifications(connected = false, needs = true, has = false, askedBefore = false))
        assertFalse(PromptRules.askToPostNotifications(connected = true, needs = true, has = false, askedBefore = true))
        assertFalse(PromptRules.askToPostNotifications(connected = true, needs = true, has = true, askedBefore = false))
        assertFalse(PromptRules.askToPostNotifications(connected = true, needs = false, has = false, askedBefore = false))
    }
}
