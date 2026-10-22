package dev.macdroid.app.ui.setup

import android.app.Application
import android.content.Intent
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.viewModelScope
import dev.macdroid.app.graph
import dev.macdroid.app.platform.Permissions
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.transformLatest

class SetupViewModel(application: Application, private val saved: SavedStateHandle) : AndroidViewModel(application) {
    private data class Local(
        val setupDone: Boolean,
        val hasLocalNetwork: Boolean,
        val filesStepDone: Boolean,
        val photosStepDone: Boolean,
    )

    private val graph = application.graph
    private val local = MutableStateFlow(readLocal())
    // Kept in the saved state, so the process being killed mid-setup resumes at the same step (Plan 11).
    private val batteryDone = saved.getMutableStateFlow(BATTERY_DONE, false)
    private var sawUnpaired = graph.pairingStore.paired.value == null

    /** Pairing state, holding "paired" back for a moment after a fresh pairing so the success screen is seen. */
    @OptIn(ExperimentalCoroutinesApi::class)
    private val paired: Flow<Boolean> = graph.pairingStore.paired
        .map { it != null }
        .distinctUntilChanged()
        .transformLatest { isPaired ->
            if (isPaired && sawUnpaired) delay(SUCCESS_PAUSE_MS)
            sawUnpaired = !isPaired
            // Pairing can change prefs, so re-read them with each pairing change.
            local.value = readLocal()
            emit(isPaired)
        }

    val macName: StateFlow<String?> = graph.pairingStore.paired
        .map { it?.name }
        .stateIn(viewModelScope, SharingStarted.Eagerly, graph.pairingStore.paired.value?.name)

    val state: StateFlow<SetupUiState> = combine(local, batteryDone, paired, graph.uiPrefs.keepConnectedFlow) { l, battery, isPaired, keep ->
        SetupUiState.from(inputs(l, battery, isPaired), keep)
    }.stateIn(
        viewModelScope,
        SharingStarted.Eagerly,
        SetupUiState.from(inputs(local.value, batteryDone.value, graph.pairingStore.paired.value != null), graph.uiPrefs.keepConnected),
    )

    /** Re-read permissions and preferences (call on resume and after a permission prompt). */
    fun refresh() {
        graph.notificationBridge.refreshAccess()
        graph.photosBridge.refreshAccess()
        local.value = readLocal()
    }

    /** "Where should files from your Mac go?": null keeps Download/MacDroid; a tree URI is a folder the user chose. */
    fun completeFiles(treeUri: Uri?) {
        val app = getApplication<Application>()
        if (treeUri != null) {
            runCatching {
                app.contentResolver.takePersistableUriPermission(treeUri, Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                graph.filesPrefs.treeUri = treeUri.toString()
            }
        }
        graph.filesPrefs.filesStepDone = true
        refresh()
    }

    /** "See your photos on your Mac": answered either way (the permission result itself is read from the system). */
    fun completePhotos() {
        graph.uiPrefs.photosStepDone = true
        graph.photosBridge.afterPrompt()
        refresh()
    }

    fun completeBattery() {
        graph.uiPrefs.setupDone = true
        batteryDone.value = true
        refresh()
    }

    private fun inputs(l: Local, battery: Boolean, isPaired: Boolean) = SetupInputs(
        setupDone = l.setupDone,
        needsLocalNetwork = Permissions.needsLocalNetwork,
        hasLocalNetwork = l.hasLocalNetwork,
        paired = isPaired,
        batteryDone = battery,
        filesStepDone = l.filesStepDone,
        photosStepDone = l.photosStepDone,
    )

    private fun readLocal(): Local {
        val app = getApplication<Application>()
        return Local(
            setupDone = graph.uiPrefs.setupDone,
            hasLocalNetwork = Permissions.hasLocalNetwork(app),
            filesStepDone = graph.filesPrefs.filesStepDone,
            photosStepDone = graph.uiPrefs.photosStepDone,
        )
    }

    private companion object {
        const val SUCCESS_PAUSE_MS = 1_000L
        const val BATTERY_DONE = "batteryDone"
    }
}
