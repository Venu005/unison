package dev.macdroid.app.platform.mirror

/** What [MirrorConsentActivity] shows when it starts or is recreated (rotation, process death). */
object MirrorConsentRules {
    enum class Start { Sheet, Capture, Nothing }

    fun onCreate(restored: Boolean, sheetShowing: Boolean, wantsAudio: Boolean, hasMicrophone: Boolean): Start = when {
        // The microphone explanation was on screen: show it again (it isn't restored by the system).
        restored -> if (sheetShowing && wantsAudio && !hasMicrophone) Start.Sheet else Start.Nothing
        wantsAudio && !hasMicrophone -> Start.Sheet
        else -> Start.Capture
    }
}
