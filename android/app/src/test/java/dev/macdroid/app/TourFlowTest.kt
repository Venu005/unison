package dev.macdroid.app

import dev.macdroid.app.ui.tour.TourFlow
import dev.macdroid.app.ui.tour.TourPrefs
import dev.macdroid.app.ui.tour.TourTarget
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** The hands-on guided tour (Plan 14): one highlighted action at a time, advancing only when the user does it. */
class TourFlowTest {
    private fun fresh() = TourFlow(TourPrefs.State(index = 0, finished = false))
    private fun TourFlow.finishConnect() { done(TourTarget.ScanQr); done(TourTarget.AllowLocalNetwork); done(TourTarget.AllowCamera) }

    @Test fun startsAtConnectAndCannotSkipIt() {
        val t = fresh()
        assertEquals(TourTarget.ScanQr, t.current?.target)
        assertFalse(t.current!!.skippable)
        t.skipStep()
        assertEquals(TourTarget.ScanQr, t.current?.target)
        t.end()
        assertFalse(t.finished)
        assertEquals(TourTarget.ScanQr, t.current?.target)
    }

    @Test fun advancesOnlyOnTheHighlightedAction() {
        val t = fresh()
        assertFalse(t.done(TourTarget.Send))
        assertEquals(TourTarget.ScanQr, t.current?.target)
        assertTrue(t.done(TourTarget.ScanQr))
        assertEquals(TourTarget.AllowLocalNetwork, t.current?.target)
    }

    @Test fun skipsAWholeGroupAfterConnect() {
        val t = fresh().apply { finishConnect() }
        assertEquals(TourTarget.Send, t.current?.target)
        t.skipStep()
        assertEquals(TourTarget.NotificationsTab, t.current?.target)
    }

    @Test fun deniedSystemPromptKeepsTheStepWithRetry() {
        val t = fresh().apply { done(TourTarget.ScanQr) }
        t.denied(TourTarget.AllowLocalNetwork)
        assertEquals(TourTarget.AllowLocalNetwork, t.current?.target)
        assertTrue(t.retry)
        t.done(TourTarget.AllowLocalNetwork)
        assertFalse(t.retry)
    }

    @Test fun resumesAtTheSavedStep() {
        assertEquals(TourTarget.SendPhotos, TourFlow(TourPrefs.State(index = 4, finished = false)).current?.target)
    }

    @Test fun finishedNeverReShows() {
        val t = fresh().apply { finishConnect() }
        t.end()
        assertTrue(t.finished)
        val again = TourFlow(t.state())
        assertNull(again.current)
        assertTrue(again.finished)
        again.restart(paired = false)
        assertEquals(TourTarget.ScanQr, again.current?.target)
        assertFalse(again.finished)
    }

    @Test fun walkingEveryStepFinishes() {
        val t = fresh()
        TourTarget.entries.forEach { assertTrue(it.name, t.done(it)) }
        assertTrue(t.finished)
        assertNull(t.current)
    }

    @Test fun pairingFinishesTheConnectStep() {
        val t = fresh().apply { done(TourTarget.ScanQr) }
        t.connected()
        assertEquals(TourTarget.Send, t.current?.target)
        t.connected()
        assertEquals(TourTarget.Send, t.current?.target)
    }

    @Test fun aGroupAlreadyDoneSkipsItself() {
        val t = TourFlow(TourPrefs.State(index = 5, finished = false))
        t.skipGroup(3)
        assertEquals(TourTarget.NotificationsTab, t.current?.target)
        t.skipGroup(2)
        assertEquals(TourTarget.ClipboardTab, t.current?.target)
    }

    @Test fun restartOnAPairedPhoneSkipsConnecting() {
        val t = fresh().apply { finishConnect(); end() }
        t.restart(paired = true)
        assertEquals(TourTarget.Send, t.current?.target)
        t.restart(paired = false)
        assertEquals(TourTarget.ScanQr, t.current?.target)
    }

    @Test fun copyMatchesTheSpec() {
        assertEquals(
            listOf("Connect to your Mac", "Send a photo to your Mac", "Turn on notifications", "Send your clipboard", "Unison control (optional)"),
            fresh().groups,
        )
    }
}
