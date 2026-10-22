package dev.macdroid.app.ui.tour

import android.content.Context

/** Where the guided tour is, so leaving mid-way resumes at the same step and a finished tour never comes back. */
object TourPrefs {
    data class State(val index: Int, val finished: Boolean)

    private const val PREFS = "tour"

    fun load(context: Context): State {
        val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return State(p.getInt("index", 0), p.getBoolean("finished", false))
    }

    fun save(context: Context, state: State) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putInt("index", state.index).putBoolean("finished", state.finished).apply()
    }
}
