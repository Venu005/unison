package dev.macdroid.app.ui

/** When to send the user to Settings, and when to ask for permissions outside a screen of their own (Plan 14). */
object PromptRules {
    /** Android shows nothing once a permission was denied twice; then the app's settings are the only way on. */
    fun openSettingsAfter(granted: Boolean, canAskAgain: Boolean): Boolean = !granted && !canAskAgain

    /**
     * "Post notifications" (Android 13+) is asked once, after the phone first connects: the connection's notice and
     * mirror requests from the Mac need it, and it isn't tied to notification access any more.
     */
    fun askToPostNotifications(connected: Boolean, needs: Boolean, has: Boolean, askedBefore: Boolean): Boolean =
        connected && needs && !has && !askedBefore
}
