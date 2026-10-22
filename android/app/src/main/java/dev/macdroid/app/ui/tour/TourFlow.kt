package dev.macdroid.app.ui.tour

/** Each control the tour can highlight, in tour order (spec: "The guided tour", prototype v2). */
enum class TourTarget { ScanQr, AllowLocalNetwork, AllowCamera, Send, SendPhotos, NotificationsTab, TurnOnNotifications, NotificationsAgree, ClipboardTab, SendClipboard, SettingsTab, ControlSwitch, ControlAgree }

data class TourStep(val group: Int, val target: TourTarget, val title: String, val tip: String, val skippable: Boolean)

/**
 * The hands-on guided tour (Plan 14): one highlighted action at a time, finished only when the user really does it.
 * Group 0 (connecting) can't be skipped or ended; after it, any group can be skipped and the tour ended.
 */
class TourFlow(saved: TourPrefs.State) {
    var index = saved.index.coerceIn(0, STEPS.size)
        private set
    var finished = saved.finished
        private set
    /** Android's prompt for the current step was declined: the bubble says how to try again. */
    var retry = false
        private set

    val groups: List<String> get() = GROUPS
    val current: TourStep? get() = if (finished) null else STEPS.getOrNull(index)

    /** The user did [target]. Advances only when it's the highlighted one. */
    fun done(target: TourTarget): Boolean {
        if (current?.target != target) return false
        index++
        retry = false
        if (index >= STEPS.size) finished = true
        return true
    }

    fun denied(target: TourTarget) {
        if (current?.target == target) retry = true
    }

    fun skipStep() {
        val step = current ?: return
        if (!step.skippable) return
        while (STEPS.getOrNull(index)?.group == step.group) index++
        retry = false
        if (index >= STEPS.size) finished = true
    }

    fun end() {
        if (current?.skippable == false) return
        finished = true
    }

    /** Pairing worked: "Connect to your Mac" is done, whichever of its prompts were already answered. */
    fun connected() {
        if (current?.group == 0) jumpTo(firstOf(1))
    }

    /** The tour reached [group] but its job is already done (access granted earlier): move past it. */
    fun skipGroup(group: Int) {
        if (current?.group == group) jumpTo(STEPS.indexOfLast { it.group == group } + 1)
    }

    /** "Show the tour again". A paired phone starts after connecting; it's never asked to pair again. */
    fun restart(paired: Boolean) {
        finished = false
        jumpTo(if (paired) firstOf(1) else 0)
    }

    private fun firstOf(group: Int) = STEPS.indexOfFirst { it.group == group }

    private fun jumpTo(i: Int) {
        index = i
        retry = false
        if (index >= STEPS.size) finished = true
    }

    fun state() = TourPrefs.State(index, finished)

    companion object {
        private val GROUPS = listOf("Connect to your Mac", "Send a photo to your Mac", "Turn on notifications", "Send your clipboard", "Unison control (optional)")
        private fun step(group: Int, target: TourTarget, tip: String) = TourStep(group, target, GROUPS[group], tip, skippable = group > 0)
        val STEPS = listOf(
            step(0, TourTarget.ScanQr, "Get Unison on your Mac first, then tap Scan the QR code."),
            step(0, TourTarget.AllowLocalNetwork, "Android asks before Unison can reach your Mac on Wi-Fi. Tap Allow."),
            step(0, TourTarget.AllowCamera, "The camera is only used to read the QR code. Tap While using the app."),
            step(1, TourTarget.Send, "You're connected! Now tap Send."),
            step(1, TourTarget.SendPhotos, "Pick Photos, then choose any photo."),
            step(2, TourTarget.NotificationsTab, "Open the Notifications tab."),
            step(2, TourTarget.TurnOnNotifications, "Tap Turn on notification access."),
            step(2, TourTarget.NotificationsAgree, "Read what Unison does with them, then tap Agree."),
            step(3, TourTarget.ClipboardTab, "Open Clipboard."),
            step(3, TourTarget.SendClipboard, "Send this phone's clipboard. Then paste on your Mac with ⌘V."),
            step(4, TourTarget.SettingsTab, "Open Settings."),
            step(4, TourTarget.ControlSwitch, "Turn on Unison control."),
            step(4, TourTarget.ControlAgree, "Tick the box, then tap Agree."),
        )
    }
}
