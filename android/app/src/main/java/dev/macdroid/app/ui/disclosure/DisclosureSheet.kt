package dev.macdroid.app.ui.disclosure

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/** The explanation Google Play requires before a sensitive permission: what, where, why, then Agree or Not now. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DisclosureSheet(gated: Gated, onAgree: () -> Unit, onNotNow: () -> Unit) {
    val d = Disclosures.of(gated)
    var checked by rememberSaveable(gated) { mutableStateOf(false) }
    ModalBottomSheet(onDismissRequest = onNotNow, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(Modifier.padding(horizontal = 24.dp).padding(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(d.title, style = MaterialTheme.typography.headlineSmall)
            Column(
                Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(16.dp)).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                d.bullets.forEach { Text("•  $it", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
            d.checkbox?.let { label ->
                Row(Modifier.fillMaxWidth().clickable { checked = !checked }, verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = checked, onCheckedChange = { checked = it })
                    Text(label, style = MaterialTheme.typography.bodyMedium)
                }
            }
            Button(onClick = onAgree, enabled = Disclosures.canAgree(gated, checked), modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(d.agreeLabel) }
            TextButton(onClick = onNotNow, modifier = Modifier.fillMaxWidth()) { Text("Not now") }
        }
    }
}

/**
 * Puts the disclosure in front of [onAgree] (the permission prompt or settings screen). Call the returned function where
 * the prompt used to be launched; [onNotNow] runs if the user declines. The sheet shows every time until it's granted.
 */
@Composable
fun rememberDisclosed(gated: Gated, onNotNow: () -> Unit = {}, onAgree: () -> Unit): () -> Unit {
    var showing by remember { mutableStateOf(false) }
    if (showing) DisclosureSheet(gated, onAgree = { showing = false; onAgree() }, onNotNow = { showing = false; onNotNow() })
    return { showing = true }
}
