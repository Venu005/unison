package dev.macdroid.app.ui.qr

import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.LuminanceSource
import com.google.zxing.ReaderException
import com.google.zxing.PlanarYUVLuminanceSource
import com.google.zxing.common.HybridBinarizer
import com.google.zxing.qrcode.QRCodeReader

/**
 * Reads a QR code from a camera frame's Y (luma) plane, on the device: ZXing, no network (Plan 14 replaced ML Kit, which
 * reported diagnostics to Google). Tries the frame as-is, then inverted for light-on-dark codes.
 */
object QrDecode {
    private val hints = mapOf(DecodeHintType.TRY_HARDER to true)

    fun decode(luma: ByteArray, width: Int, height: Int, rowStride: Int): String? {
        val source = PlanarYUVLuminanceSource(luma, rowStride, height, 0, 0, width, height, false)
        return read(source) ?: read(source.invert())
    }

    private fun read(source: LuminanceSource): String? = try {
        QRCodeReader().decode(BinaryBitmap(HybridBinarizer(source)), hints).text
    } catch (_: ReaderException) {
        null
    }
}
