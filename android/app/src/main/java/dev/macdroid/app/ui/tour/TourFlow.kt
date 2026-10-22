package dev.macdroid.app.ui.tour

/** Each control the tour can highlight, in tour order (spec: "The guided tour", prototype v2). */
enum class TourTarget {
    ScanQr, AllowLocalNetwork, AllowCamera, Send, SendPhotos, NotificationsTab, TurnOnNotifications, NotificationsAgree, ClipboardTab, SendClipboard, SettingsTab, ControlSwitch, ControlAgree,
    /** Home's connection card: step 1 on a phone that's paired but not connected (no step of its own). */
    StatusCard,
}

/** What the bubble points at and says right now. */
data class TourDisplay(val target: TourTarget, val tip: String)

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

    /** The prompts of step 1 are answered and the camera is scanning: only a real connection leaves step 1. */
    var waitingForMac = false
        private set

    /** The user did [target]. Advances only when it's the highlighted one, and never out of step 1 (see [connected]). */
    fun done(target: TourTarget): Boolean {
        val step = current ?: return false
        if (step.target != target) return false
        if (step.group == 0 && STEPS.getOrNull(index + 1)?.group != 0) {
            waitingForMac = true
            return true
        }
        index++
        retry = false
        if (index >= STEPS.size) finished = true
        return true
    }

    /** "Not now" on the disclosure sheet a step points at: skip that step rather than leave its bubble behind. */
    fun declined(target: TourTarget) {
        if (current?.target == target) skipStep()
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

    /** The phone is connected to its Mac: "Connect to your Mac" is done, whichever of its prompts were already answered. */
    fun connected() {
        if (current?.group == 0) jumpTo(firstOf(1))
    }

    /** The tour reached [group] but its job is already done (access granted earlier): move past it. */
    fun skipGroup(group: Int) {
        if (current?.group == group) jumpTo(STEPS.indexOfLast { it.group == group } + 1)
    }

    /** "Show the tour again": always from step 1, which finishes by itself once the phone is connected. */
    fun restart() {
        finished = false
        jumpTo(0)
    }

    /**
     * What to highlight. Step 1 on the Connect screen points at Scan (also after a declined prompt, which Scan asks
     * again); anywhere else, on a paired phone, it points at the connection card and says to open the Mac app.
     */
    fun display(onConnectScreen: Boolean): TourDisplay? {
        val step = current ?: return null
        return when {
            step.group != 0 -> TourDisplay(step.target, step.tip)
            !onConnectScreen -> TourDisplay(TourTarget.StatusCard, "Open Unison on your Mac and keep it on the same Wi-Fi. This phone connects by itself.")
            retry -> TourDisplay(TourTarget.ScanQr, "Unison needs this to reach your Mac. Tap Scan the QR code to try again.")
            waitingForMac -> TourDisplay(TourTarget.AllowCamera, "Point the camera at the QR code on your Mac.")
            else -> TourDisplay(step.target, step.tip)
        }
    }

    private fun firstOf(group: Int) = STEPS.indexOfFirst { it.group == group }

    private fun jumpTo(i: Int) {
        index = i
        retry = false
        waitingForMac = false
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
