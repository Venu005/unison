package dev.macdroid.app.ui.tour

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp

/** Marks a control the tour can highlight; it's forgotten when it leaves the screen. Popups, sheets and system dialogs get a bubble only. */
fun Modifier.tourTarget(target: TourTarget): Modifier = composed {
    DisposableEffect(target) { onDispose { TourTargets.registry?.bounds?.remove(target) } }
    Modifier.onGloballyPositioned { coords -> TourTargets.registry?.bounds?.set(target, coords.boundsInRoot()) }
}

/** Set by [CoachMarkHost], read by [tourTarget] (a modifier can't read composition locals). */
internal object TourTargets {
    var registry: TourController? = null
}

/** Steps whose control isn't in the main window (a system prompt, a menu or a sheet): no dimming, just the bubble. */
private val FLOATING = setOf(TourTarget.AllowLocalNetwork, TourTarget.AllowCamera, TourTarget.SendPhotos, TourTarget.NotificationsAgree, TourTarget.ControlAgree)

/**
 * The hands-on tour over [content]: everything dimmed except the current control, a pulsing ring around it and a bubble
 * with the instruction. Touches aren't blocked, so nobody is ever stuck; the tour moves on only when the user does
 * the highlighted thing.
 */
@Composable
fun CoachMarkHost(tour: TourController, content: @Composable () -> Unit) {
    DisposableEffect(tour) {
        TourTargets.registry = tour
        onDispose { if (TourTargets.registry === tour) TourTargets.registry = null }
    }
    BoxWithConstraints(Modifier.fillMaxSize()) {
        content()
        val step = tour.current
        val display = tour.display(onConnectScreen = TourTarget.ScanQr in tour.bounds)
        val target = display?.target
        val rect = target?.let { tour.bounds[it] }
        val floating = step != null && target in FLOATING
        if (step != null && display != null && (rect != null || floating)) {
            if (!floating && rect != null) Spotlight(rect)
            val heightPx = with(LocalDensity.current) { maxHeight.toPx() }
            val below = rect != null && !floating && rect.center.y < heightPx / 2
            val padPx = with(LocalDensity.current) { 20.dp.toPx() }
            val top = with(LocalDensity.current) { (rect?.bottom?.plus(padPx) ?: 0f).toDp() }
            val bottom = with(LocalDensity.current) { (heightPx - (rect?.top ?: heightPx) + padPx).toDp() }
            Box(
                Modifier.fillMaxSize().then(if (floating) Modifier.safeDrawingPadding().padding(top = 8.dp) else Modifier)
                    .padding(top = if (below) top else 0.dp, bottom = if (!below && !floating) bottom else 0.dp),
                contentAlignment = if (below || floating) Alignment.TopCenter else Alignment.BottomCenter,
            ) { Bubble(tour, step, display.tip) }
        }
    }
    if (tour.showFinish) {
        AlertDialog(
            onDismissRequest = { tour.showFinish = false },
            title = { Text("You're all set") },
            text = { Text("Unison runs quietly in the background. Your Mac shows a phone icon in its menu bar.") },
            confirmButton = { TextButton(onClick = { tour.showFinish = false }) { Text("Start using Unison") } },
        )
    }
}

@Composable
private fun Spotlight(rect: androidx.compose.ui.geometry.Rect) {
    val pulse by rememberInfiniteTransition(label = "tour-ring").animateFloat(0f, 1f, infiniteRepeatable(tween(1400), RepeatMode.Restart), label = "tour-ring")
    val ring = MaterialTheme.colorScheme.primary
    Canvas(Modifier.fillMaxSize().graphicsLayer(compositingStrategy = CompositingStrategy.Offscreen)) {
        val pad = 6.dp.toPx()
        val corner = CornerRadius(20.dp.toPx())
        val hole = Offset(rect.left - pad, rect.top - pad)
        val holeSize = Size(rect.width + pad * 2, rect.height + pad * 2)
        drawRect(Color.Black.copy(alpha = 0.6f))
        drawRoundRect(Color.Transparent, hole, holeSize, corner, blendMode = BlendMode.Clear)
        val grow = 10.dp.toPx() * pulse
        drawRoundRect(
            ring.copy(alpha = 1f - pulse), Offset(hole.x - grow, hole.y - grow), Size(holeSize.width + grow * 2, holeSize.height + grow * 2),
            CornerRadius(corner.x + grow), style = Stroke(2.dp.toPx()),
        )
    }
}

@Composable
private fun Bubble(tour: TourController, step: TourStep, tip: String) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
    ) {
        Column(Modifier.padding(start = 16.dp, end = 8.dp, top = 14.dp, bottom = 4.dp)) {
            Text("STEP ${step.group + 1} OF ${tour.stepCount}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
            Text(step.title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 4.dp))
            Text(tip, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp, end = 8.dp))
            if (step.skippable) {
                Row(Modifier.fillMaxWidth()) {
                    TextButton(onClick = tour::skipStep) { Text("Skip this step") }
                    Box(Modifier.weight(1f))
                    TextButton(onClick = tour::end) { Text("End tour") }
                }
            } else {
                Box(Modifier.padding(bottom = 10.dp))
            }
        }
    }
}
