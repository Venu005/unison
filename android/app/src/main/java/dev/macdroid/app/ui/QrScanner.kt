package dev.macdroid.app.ui

import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import dev.macdroid.app.ui.qr.QrDecode
import java.util.concurrent.Executors

@Composable
internal fun QrCameraPreview(enabled: Boolean, onResult: (String) -> Unit, onCameraError: () -> Unit, modifier: Modifier) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val currentEnabled by rememberUpdatedState(enabled)
    val currentOnResult by rememberUpdatedState(onResult)
    val providerFuture = remember { ProcessCameraProvider.getInstance(context) }
    val executor = remember { Executors.newSingleThreadExecutor() }
    val mainExecutor = remember { ContextCompat.getMainExecutor(context) }
    var disposed by remember { mutableStateOf(false) }
    var analysisUseCase by remember { mutableStateOf<ImageAnalysis?>(null) }
    DisposableEffect(Unit) {
        onDispose {
            disposed = true
            analysisUseCase?.clearAnalyzer()
            runCatching { if (providerFuture.isDone) providerFuture.get().unbindAll() }
            executor.shutdown()
        }
    }
    AndroidView(modifier = modifier, factory = { viewContext ->
        val previewView = PreviewView(viewContext)
        providerFuture.addListener({
            if (disposed) return@addListener
            try {
            val provider = providerFuture.get()
            val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
            val analysis = ImageAnalysis.Builder().setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()
            analysis.setAnalyzer(executor) { proxy ->
                proxy.use {
                    if (!currentEnabled) return@setAnalyzer
                    // The Y plane is the luma; ZXing reads it directly. QR codes decode in any rotation.
                    val y = proxy.planes[0]
                    val bytes = ByteArray(y.buffer.remaining()).also { y.buffer.get(it) }
                    QrDecode.decode(bytes, proxy.width, proxy.height, y.rowStride)
                        ?.takeIf { it.startsWith("macdroid://") }
                        ?.let { code -> mainExecutor.execute { currentOnResult(code) } }
                }
            }
            provider.unbindAll()
            analysisUseCase = analysis
            provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
            } catch (e: Exception) {
                if (!disposed) onCameraError()
            }
        }, ContextCompat.getMainExecutor(viewContext))
        previewView
    })
}
