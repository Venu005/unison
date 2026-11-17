package dev.macdroid.app

import dev.macdroid.app.ui.setup.SetupFlow
import dev.macdroid.app.ui.setup.SetupInputs
import dev.macdroid.app.ui.setup.SetupStep
import dev.macdroid.app.ui.setup.SetupUiState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SetupFlowTest {
    private fun inputs(
        setupDone: Boolean = false,
        needsLocalNetwork: Boolean = true,
        hasLocalNetwork: Boolean = false,
        paired: Boolean = false,
        batteryDone: Boolean = false,
        filesStepDone: Boolean = false,
        photosStepDone: Boolean = false,
        // Answered by default so the other tests start at "Connect to your Mac"; the Control tests below set it.
        controlStepDone: Boolean = true,
        controlOn: Boolean = false,
    ) = SetupInputs(setupDone, needsLocalNetwork, hasLocalNetwork, paired, batteryDone, filesStepDone, photosStepDone, controlStepDone = controlStepDone, controlOn = controlOn)

    // Plan 14: the guided tour starts with "Connect to your Mac" (local network and camera are asked from its Scan
    // button); notifications moved into the tour.
    @Test fun welcomeIsGoneConnectComesFirst() {
        assertEquals(listOf(SetupStep.Control, SetupStep.PairMac, SetupStep.LocalNetwork, SetupStep.Files, SetupStep.Photos, SetupStep.Battery), SetupFlow.steps(inputs()))
        assertEquals(SetupStep.PairMac, SetupFlow.current(inputs()))
    }

    @Test fun firstRunSkipsPermissionsTheOsDoesNotHave() {
        assertEquals(listOf(SetupStep.Control, SetupStep.PairMac, SetupStep.Files, SetupStep.Photos, SetupStep.Battery), SetupFlow.steps(inputs(needsLocalNetwork = false)))
    }

    @Test fun advancesAsEachStepCompletes() {
        assertEquals(SetupStep.LocalNetwork, SetupFlow.current(inputs(paired = true)))
        assertEquals(SetupStep.Files, SetupFlow.current(inputs(paired = true, hasLocalNetwork = true)))
        assertEquals(SetupStep.Photos, SetupFlow.current(inputs(paired = true, hasLocalNetwork = true, filesStepDone = true)))
        assertEquals(SetupStep.Battery, SetupFlow.current(inputs(paired = true, hasLocalNetwork = true, filesStepDone = true, photosStepDone = true)))
        assertNull(SetupFlow.current(inputs(paired = true, hasLocalNetwork = true, filesStepDone = true, photosStepDone = true, batteryDone = true)))
    }

    @Test fun progressPosition() {
        val state = SetupUiState.from(inputs(paired = true, hasLocalNetwork = true), keepConnected = true)
        assertEquals(SetupStep.Files, state.step)
        assertEquals(4, state.position)
        assertEquals(6, state.total)
        assertTrue(state.firstRun)
    }

    // Review Focus #1
    @Test fun upgradedUserGoesStraightToMain() {
        assertNull(SetupFlow.current(inputs(setupDone = true, hasLocalNetwork = true, paired = true)))
    }

    @Test fun revokedLocalNetworkRoutesToThatStepOnly() {
        val revoked = inputs(setupDone = true, hasLocalNetwork = false, paired = true)
        assertEquals(listOf(SetupStep.LocalNetwork), SetupFlow.steps(revoked))
        assertEquals(SetupStep.LocalNetwork, SetupFlow.current(revoked))
    }

    @Test fun forgottenMacAfterSetupNeedsOnlyPairing() {
        assertEquals(listOf(SetupStep.PairMac), SetupFlow.steps(inputs(setupDone = true, hasLocalNetwork = true, paired = false)))
    }

    @Test fun readyToConnectNeedsPairingPermissionAndPreference() {
        val ready = inputs(setupDone = true, hasLocalNetwork = true, paired = true)
        assertTrue(SetupUiState.from(ready, keepConnected = true).readyToConnect)
        assertFalse(SetupUiState.from(ready, keepConnected = false).readyToConnect)
        assertFalse(SetupUiState.from(ready.copy(hasLocalNetwork = false), keepConnected = true).readyToConnect)
        assertFalse(SetupUiState.from(ready.copy(paired = false), keepConnected = true).readyToConnect)
    }

    @Test fun filesAndPhotosStepsAreFirstRunOnly() {
        assertNull(SetupFlow.current(inputs(setupDone = true, hasLocalNetwork = true, paired = true, filesStepDone = false, photosStepDone = false)))
    }

    // Play rejection 2026-11-13: the Accessibility disclosure must be reachable in normal use, before pairing.
    @Test fun controlDisclosureComesFirstAndNeedsNoMac() {
        val fresh = inputs(controlStepDone = false)
        assertEquals(SetupStep.Control, SetupFlow.current(fresh))
        assertFalse(fresh.paired)
        assertEquals(SetupStep.PairMac, SetupFlow.current(fresh.copy(controlStepDone = true)))
    }

    @Test fun controlStepSkippedWhenAlreadyOnOrSetupDone() {
        assertEquals(SetupStep.PairMac, SetupFlow.current(inputs(controlStepDone = false, controlOn = true)))
        assertNull(SetupFlow.current(inputs(setupDone = true, hasLocalNetwork = true, paired = true, controlStepDone = false)))
        assertFalse(SetupStep.Control in SetupFlow.steps(inputs(setupDone = true, controlStepDone = false)))
    }
}
