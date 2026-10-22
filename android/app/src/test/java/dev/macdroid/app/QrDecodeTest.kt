package dev.macdroid.app

import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import dev.macdroid.app.ui.qr.QrDecode
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** The pairing QR code read from camera-like luma frames (Plan 14: on-device ZXing, no ML Kit). */
class QrDecodeTest {
    private val payload = "macdroid://pair?host=192.168.1.5&port=48291&fp=ab12"

    /** A W×H Y-plane with the code drawn in the middle; `stride` ≥ W adds padding bytes at the end of each row. */
    private fun frame(w: Int = 480, h: Int = 480, stride: Int = w, invert: Boolean = false): ByteArray {
        val m = QRCodeWriter().encode(payload, BarcodeFormat.QR_CODE, 300, 300)
        val ox = (w - m.width) / 2
        val oy = (h - m.height) / 2
        val out = ByteArray(stride * h) { 0x55 }
        for (y in 0 until h) for (x in 0 until w) {
            val inside = x - ox in 0 until m.width && y - oy in 0 until m.height
            val dark = inside && m[x - ox, y - oy]
            val v = if (dark) 0 else 255
            out[y * stride + x] = (if (invert) 255 - v else v).toByte()
        }
        return out
    }

    @Test fun decodesAPlainFrame() = assertEquals(payload, QrDecode.decode(frame(), 480, 480, 480))
    @Test fun decodesWithRowPadding() = assertEquals(payload, QrDecode.decode(frame(stride = 544), 480, 480, 544))
    @Test fun decodesInvertedDarkModeCode() = assertEquals(payload, QrDecode.decode(frame(invert = true), 480, 480, 480))
    @Test fun returnsNullForNoCode() = assertNull(QrDecode.decode(ByteArray(480 * 480) { 0x7f }, 480, 480, 480))
}
