package dev.macdroid.app.ui.tour

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.geometry.Rect

/** The guided tour for the whole app: [TourFlow] plus saving, and the on-screen bounds of every [TourTarget]. */
class TourController(private val context: Context, setupDone: Boolean) {
    private val flow = TourFlow(
        when {
            TourPrefs.saved(context) -> TourPrefs.load(context)
            // Someone who finished setup before the tour existed isn't sent back through it (Settings can start it).
            setupDone -> TourPrefs.State(index = 0, finished = true)
            else -> TourPrefs.State(index = 0, finished = false)
        },
    )
    private var changes by mutableIntStateOf(0)

    /** Where each tagged control is on screen, from [tourTarget]. */
    val bounds = mutableStateMapOf<TourTarget, Rect>()
    /** The tour just ended (finished or ended early): show "You're all set" once. */
    var showFinish by mutableStateOf(false)

    val current: TourStep? get() = changes.let { flow.current }
    val retry: Boolean get() = changes.let { flow.retry }
    val stepCount: Int get() = flow.groups.size

    fun done(target: TourTarget) = update { flow.done(target) }
    fun denied(target: TourTarget) = update { flow.denied(target); true }
    fun connected() = update { flow.connected(); true }
    fun skipGroup(group: Int) = update { flow.skipGroup(group); true }
    fun skipStep() = update { flow.skipStep(); true }
    fun end() = update { flow.end(); true }
    fun restart(paired: Boolean) = update { flow.restart(paired); true }

    private fun update(change: () -> Boolean) {
        val wasActive = !flow.finished
        if (!change()) return
        if (wasActive && flow.finished) showFinish = true
        TourPrefs.save(context, flow.state())
        changes++
    }
}

/** The app's tour, or null where there is none (previews, other activities). */
val LocalTour = staticCompositionLocalOf<TourController?> { null }
