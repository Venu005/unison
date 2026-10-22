package dev.macdroid.app.ui.setup

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.NoPhotography
import androidx.compose.material.icons.rounded.PhotoCamera
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.macdroid.app.platform.Permissions
import dev.macdroid.app.ui.PairingViewModel
import dev.macdroid.app.ui.QrCameraPreview
import dev.macdroid.app.ui.tour.LocalTour
import dev.macdroid.app.ui.tour.TourTarget
import dev.macdroid.app.ui.tour.tourTarget
import dev.macdroid.core.tls.Fingerprint

/** The hero setup step: camera inline, manual entry as a fallback, result shown in place. */
@Composable
fun PairStep(viewModel: PairingViewModel, macName: String?) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    // Clear a stale result once per visit to this step — not on rotation (rememberSaveable survives it).
    var resetDone by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        if (!resetDone) {
            viewModel.resetIfFinished()
            resetDone = true
        }
    }
    var showManual by rememberSaveable { mutableStateOf(false) }
    var cameraAsked by rememberSaveable { mutableStateOf(false) }
    // The camera opens only after Scan, which first asks for local network and camera access (tour step 1, Plan 14).
    var scanning by rememberSaveable { mutableStateOf(false) }
    val context = LocalContext.current
    val tour = LocalTour.current
    val camera = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        cameraAsked = true
        if (granted) { tour?.done(TourTarget.AllowCamera); scanning = true } else tour?.denied(TourTarget.AllowCamera)
    }
    val askCamera = {
        if (Permissions.granted(context, Manifest.permission.CAMERA)) { tour?.done(TourTarget.AllowCamera); scanning = true }
        else camera.launch(Manifest.permission.CAMERA)
    }
    val localNetwork = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) { tour?.done(TourTarget.AllowLocalNetwork); askCamera() } else tour?.denied(TourTarget.AllowLocalNetwork)
    }
    val scan = {
        tour?.done(TourTarget.ScanQr)
        if (Permissions.needsLocalNetwork && !Permissions.hasLocalNetwork(context)) localNetwork.launch(Permissions.ACCESS_LOCAL_NETWORK)
        else { tour?.done(TourTarget.AllowLocalNetwork); askCamera() }
    }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text("Connect to your Mac", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.fillMaxWidth().padding(top = 24.dp, bottom = 12.dp))
        if (!scanning && state == PairingViewModel.UiState.Idle) {
            NumberedCard(1, "Install Unison on your Mac (free, macOS 14 or later). On the Mac, open:") {
                Row(
                    Modifier.fillMaxWidth().padding(top = 8.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surface).padding(start = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(MAC_APP_URL, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                    TextButton(onClick = {
                        context.getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Unison for Mac", "https://$MAC_APP_URL"))
                        Toast.makeText(context, "Link copied", Toast.LENGTH_SHORT).show()
                    }) { Text("Copy") }
                }
            }
            NumberedCard(2, "Open Unison on the Mac. It shows a QR code.")
            NumberedCard(3, "Scan it with this phone. You only do this once.")
            Button(onClick = scan, modifier = Modifier.fillMaxWidth().padding(top = 8.dp).height(52.dp).tourTarget(TourTarget.ScanQr)) { Text("Scan the QR code") }
        } else Box(
            Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(28.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center,
        ) {
            when (val s = state) {
                PairingViewModel.UiState.Working -> Message(null, "Pairing with your Mac…", null) { CircularProgressIndicator() }
                PairingViewModel.UiState.Paired -> Message(Icons.Rounded.CheckCircle, "Paired with ${macName ?: "your Mac"}", null)
                is PairingViewModel.UiState.Error -> Message(Icons.Rounded.ErrorOutline, s.message, null, iconTint = MaterialTheme.colorScheme.error) {
                    Button(onClick = viewModel::reset) { Text("Try again") }
                }
                else -> CameraArea(enabled = s == PairingViewModel.UiState.Idle, asked = cameraAsked, onAsked = { cameraAsked = true }, onResult = viewModel::onScanned)
            }
        }
        TextButton(
            onClick = { showManual = true },
            enabled = state == PairingViewModel.UiState.Idle,
            modifier = Modifier.padding(vertical = 12.dp),
        ) { Text("Can't scan? Type the code instead") }
    }

    if (showManual) {
        ManualPairSheet(
            onDismiss = { showManual = false },
            onSubmit = { host, port, code ->
                showManual = false
                viewModel.onManual(host, port, code)
            },
        )
    }
    (state as? PairingViewModel.UiState.Confirm)?.let { confirm ->
        AlertDialog(
            onDismissRequest = viewModel::reset,
            title = { Text("Check the fingerprint") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Does your Mac show this fingerprint under “Can't scan?”")
                    Text(Fingerprint.display(confirm.fingerprint), style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Monospace)
                }
            },
            confirmButton = { TextButton(onClick = viewModel::confirmFingerprint) { Text("They match") } },
            dismissButton = { TextButton(onClick = viewModel::reset) { Text("Cancel") } },
        )
    }
}

/** Where Play users get the Mac app; a plain link with no payment wording (Play policy, Plan 13/14). */
private const val MAC_APP_URL = "venu005.github.io/unison"

@Composable
private fun NumberedCard(n: Int, text: String, extra: @Composable () -> Unit = {}) {
    Column(Modifier.fillMaxWidth().padding(vertical = 6.dp).clip(RoundedCornerShape(20.dp)).background(MaterialTheme.colorScheme.surfaceVariant).padding(16.dp)) {
        Row(verticalAlignment = Alignment.Top) {
            Box(Modifier.size(24.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary), contentAlignment = Alignment.Center) {
                Text("$n", color = MaterialTheme.colorScheme.onPrimary, style = MaterialTheme.typography.labelMedium)
            }
            Text(text, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(start = 10.dp))
        }
        extra()
    }
}

@Composable
private fun CameraArea(enabled: Boolean, asked: Boolean, onAsked: () -> Unit, onResult: (String) -> Unit) {
    val context = LocalContext.current
    var hasCamera by remember { mutableStateOf(Permissions.granted(context, Manifest.permission.CAMERA)) }
    var cameraError by remember { mutableStateOf(false) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        hasCamera = it
        onAsked()
    }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { hasCamera = Permissions.granted(context, Manifest.permission.CAMERA) }
    LaunchedEffect(Unit) { if (!hasCamera && !asked) launcher.launch(Manifest.permission.CAMERA) }
    when {
        cameraError -> Message(Icons.Rounded.NoPhotography, "Camera unavailable", "Close other apps using the camera, or enter the code manually.")
        hasCamera -> QrCameraPreview(enabled, onResult, { cameraError = true }, Modifier.fillMaxSize())
        else -> Message(Icons.Rounded.PhotoCamera, "Camera access needed", "Allow the camera to scan the code, or enter it manually.") {
            Button(onClick = { if (asked) context.openAppSettings() else launcher.launch(Manifest.permission.CAMERA) }) {
                Text(if (asked) "Open settings" else "Allow camera")
            }
        }
    }
}

@Composable
private fun Message(
    icon: ImageVector?,
    title: String,
    body: String?,
    iconTint: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.primary,
    action: @Composable () -> Unit = {},
) {
    Column(
        Modifier.padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (icon != null) Icon(icon, contentDescription = null, modifier = Modifier.size(56.dp), tint = iconTint)
        Text(title, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
        if (body != null) {
            Text(body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        }
        action()
    }
}
