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
    private val sources = File("src/main").walkTopDown().filter { it.isFile && it.extension in setOf("kt", "xml") }.toList()

    @Test fun noPaymentWordsOrLinksInTheApp() {
        assertTrue("no sources found from ${File(".").absolutePath}", sources.isNotEmpty())
        val hits = sources.flatMap { f -> paymentHits(f.readText()).map { "${f.path}: $it" } }
        assertEquals(emptyList<String>(), hits)
    }

    @Test fun catchesMoneyWordingInVisibleText() {
        assertEquals(listOf("\"Support Unison\""), paymentHits("""Text("Support Unison")"""))
        assertEquals(1, paymentHits("""Text("Leave a tip")""").size)
        assertEquals(1, paymentHits("""Text("Our sponsors")""").size)
        assertEquals(1, paymentHits("""<string name="x">Donate</string>""").size)
        assertEquals(1, paymentHits("""Uri.parse("https://github.com/sponsors/Venu005")""").size)
    }

    @Test fun ignoresIdentifiersThatOnlyLookLikeIt() {
        assertEquals(emptyList<String>(), paymentHits("""meta-data android:name="android.support.FILE_PROVIDER_PATHS""""))
        assertEquals(emptyList<String>(), paymentHits("""if (Features.SUPPORTED.contains(f)) supportingContent = { Text("Version") }"""))
        assertEquals(emptyList<String>(), paymentHits("""reply("not supported")"""))
    }

    @Test fun settingsLinksToTheWebsiteHomePage() {
        val settings = sources.single { it.name == "SettingsScreen.kt" }.readText()
        assertTrue(settings.contains("\"https://venu005.github.io/unison/\""))
    }

    // User-visible text is string literals and <string> bodies; dotted identifiers (android.support.…) are not text.
    private val literal = Regex(""""(?:[^"\\\n]|\\.)*"|<string[^>]*>[^<]*</string>""")
    private val identifier = Regex("""^"[\w]+(\.[\w]+)+"$""")
    private val money = Regex("""github\.com/sponsors|upi:|#support|\b(support(ers?)?|tips?|donat\w*|sponsor\w*|chai|buy me)\b""", RegexOption.IGNORE_CASE)

    private fun paymentHits(text: String): List<String> =
        literal.findAll(text).map { it.value }.filter { !identifier.matches(it) && money.containsMatchIn(it) }.toList()
}
