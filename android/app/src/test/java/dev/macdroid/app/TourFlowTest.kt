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
    private fun TourFlow.finishConnect() { done(TourTarget.ScanQr); done(TourTarget.AllowLocalNetwork); done(TourTarget.AllowCamera); connected() }

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
        again.restart()
        assertEquals(TourTarget.ScanQr, again.current?.target)
        assertFalse(again.finished)
    }

    @Test fun walkingEveryStepFinishes() {
        val t = fresh()
        TourFlow.STEPS.forEach { assertTrue(it.target.name, t.done(it.target)); if (it.target == TourTarget.AllowCamera) t.connected() }
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

    // Owner, 2026-10-22: "Show the tour again" on a paired but disconnected phone must start at step 1, not "tap Send".
    @Test fun restartAlwaysStartsAtConnect() {
        val t = fresh().apply { finishConnect(); end() }
        t.restart()
        assertEquals(TourTarget.ScanQr, t.current?.target)
        assertFalse(t.finished)
    }

    @Test fun pairedButOffTheConnectScreenPointsAtTheStatusCard() {
        val d = fresh().display(onConnectScreen = false)!!
        assertEquals(TourTarget.StatusCard, d.target)
        assertEquals("Open Unison on your Mac and keep it on the same Wi-Fi. This phone connects by itself.", d.tip)
    }

    @Test fun onTheConnectScreenItPointsAtScan() {
        assertEquals(TourTarget.ScanQr, fresh().display(onConnectScreen = true)!!.target)
    }

    @Test fun aDeclinedPromptPointsBackAtScan() {
        val t = fresh().apply { done(TourTarget.ScanQr); denied(TourTarget.AllowLocalNetwork) }
        val d = t.display(onConnectScreen = true)!!
        assertEquals(TourTarget.ScanQr, d.target)
        assertEquals("Unison needs this to reach your Mac. Tap Scan the QR code to try again.", d.tip)
    }

    @Test fun laterStepsShowTheirOwnTarget() {
        val t = fresh().apply { finishConnect() }
        assertEquals(TourTarget.Send, t.display(onConnectScreen = false)!!.target)
        assertNull(fresh().apply { finishConnect(); end() }.display(onConnectScreen = false))
    }

    // Final review I1: allowing the camera isn't being connected; only a real connection leaves step 1.
    @Test fun cameraGrantWaitsForTheConnection() {
        val t = fresh().apply { done(TourTarget.ScanQr); done(TourTarget.AllowLocalNetwork); done(TourTarget.AllowCamera) }
        assertEquals(0, t.current?.group)
        assertEquals("Point the camera at the QR code on your Mac.", t.display(onConnectScreen = true)!!.tip)
        t.connected()
        assertEquals(TourTarget.Send, t.current?.target)
    }

    // Final review I4: "Not now" on a disclosure sheet skips that step instead of leaving its bubble behind.
    @Test fun notNowOnASheetSkipsTheStep() {
        val t = fresh().apply { finishConnect(); skipStep() }
        t.done(TourTarget.NotificationsTab); t.done(TourTarget.TurnOnNotifications)
        assertEquals(TourTarget.NotificationsAgree, t.current?.target)
        t.declined(TourTarget.NotificationsAgree)
        assertEquals(TourTarget.ClipboardTab, t.current?.target)
        t.declined(TourTarget.ControlAgree)
        assertEquals(TourTarget.ClipboardTab, t.current?.target)
    }

    @Test fun copyMatchesTheSpec() {
        assertEquals(
            listOf("Connect to your Mac", "Send a photo to your Mac", "Turn on notifications", "Send your clipboard", "Unison control (optional)"),
            fresh().groups,
        )
    }
}
