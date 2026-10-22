package dev.macdroid.app.ui.setup

enum class SetupStep { PairMac, LocalNetwork, Files, Photos, Battery }

data class SetupInputs(
    val setupDone: Boolean,
    val needsLocalNetwork: Boolean,
    val hasLocalNetwork: Boolean,
    val paired: Boolean,
    val batteryDone: Boolean,
    /** The optional first-run step "Where should files from your Mac go?" was answered. */
    val filesStepDone: Boolean = false,
    /** The optional first-run step "See your photos on your Mac" was answered (photos spec §2). */
    val photosStepDone: Boolean = false,
)

/**
 * Which setup steps to show. First run starts at "Connect to your Mac", the first step of the guided tour (Plan 14),
 * whose Scan button asks for local network and camera access; notifications are a tour step on the main screens.
 * After setup only what's required to work again (local network permission, pairing) is shown.
 */
object SetupFlow {
    fun steps(i: SetupInputs): List<SetupStep> =
        if (i.setupDone) {
            buildList {
                if (i.needsLocalNetwork && !i.hasLocalNetwork) add(SetupStep.LocalNetwork)
                if (!i.paired) add(SetupStep.PairMac)
            }
        } else {
            buildList {
                add(SetupStep.PairMac)
                // Normally granted from the Scan button already; shown only if pairing somehow got past without it.
                if (i.needsLocalNetwork) add(SetupStep.LocalNetwork)
                add(SetupStep.Files)
                add(SetupStep.Photos)
                add(SetupStep.Battery)
            }
        }

    fun current(i: SetupInputs): SetupStep? = steps(i).firstOrNull { !isDone(it, i) }

    private fun isDone(step: SetupStep, i: SetupInputs): Boolean = when (step) {
        SetupStep.PairMac -> i.paired
        SetupStep.LocalNetwork -> !i.needsLocalNetwork || i.hasLocalNetwork
        SetupStep.Files -> i.filesStepDone || i.setupDone
        // Existing users never see it (photos spec §9.8); Settings → Photos covers them.
        SetupStep.Photos -> i.photosStepDone || i.setupDone
        SetupStep.Battery -> i.batteryDone || i.setupDone
    }
}

data class SetupUiState(
    val step: SetupStep?,
    /** 1-based position of [step] among the steps shown in this run. */
    val position: Int,
    val total: Int,
    val firstRun: Boolean,
    /** Paired, allowed on the local network, and the user wants to stay connected. */
    val readyToConnect: Boolean,
) {
    companion object {
        fun from(i: SetupInputs, keepConnected: Boolean): SetupUiState {
            val steps = SetupFlow.steps(i)
            val step = SetupFlow.current(i)
            return SetupUiState(
                step = step,
                position = if (step == null) steps.size else steps.indexOf(step) + 1,
                total = steps.size,
                firstRun = !i.setupDone,
                readyToConnect = i.paired && (!i.needsLocalNetwork || i.hasLocalNetwork) && keepConnected,
            )
        }
    }
}
