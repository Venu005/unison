package dev.macdroid.app

import org.junit.Assert.assertThrows
import org.junit.Test

/** "Unison collects nothing": no library that reports to Google ships in the app (Plan 14; ML Kit used datatransport). */
class NoTelemetryTest {
    @Test fun mlKitAndDatatransportAreAbsent() {
        for (name in listOf("com.google.mlkit.vision.barcode.BarcodeScanning", "com.google.android.datatransport.TransportFactory")) {
            assertThrows(name, ClassNotFoundException::class.java) { Class.forName(name) }
        }
    }
}
