package dev.macdroid.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Google Play's Payments policy: the app must not ask for money or link to a tip page (Plan 13). It only links to the
 * website's home page, with no money wording. Gradle runs JVM unit tests from the module directory.
 */
class NoPaymentLinksTest {
    private val forbidden = Regex("""github\.com/sponsors|upi:|#support|\b(sponsor|donat\w*|tip jar|buy me)\b""", RegexOption.IGNORE_CASE)
    private val sources = File("src/main").walkTopDown().filter { it.isFile && it.extension in setOf("kt", "xml") }.toList()

    @Test fun noPaymentWordsOrLinksInTheApp() {
        assertTrue("no sources found from ${File(".").absolutePath}", sources.isNotEmpty())
        val hits = sources.flatMap { f -> f.readLines().withIndex().filter { forbidden.containsMatchIn(it.value) }.map { "${f.path}:${it.index + 1}: ${it.value.trim()}" } }
        assertEquals(emptyList<String>(), hits)
    }

    @Test fun settingsLinksToTheWebsiteHomePage() {
        val settings = sources.single { it.name == "SettingsScreen.kt" }.readText()
        assertTrue(settings.contains("\"https://venu005.github.io/unison/\""))
    }
}
