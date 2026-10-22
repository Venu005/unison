package dev.macdroid.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Unison control as Google Play sees it (Plan 14): not an accessibility tool, watching no app, and with no code left that
 * presses Android's screen-share consent ("auto-Start", removed). Gradle runs JVM unit tests from the module directory.
 */
class ControlServiceConfigTest {
    private val config = File("src/main/res/xml/control_service.xml").readText()

    @Test fun declaresNotAnAccessibilityToolAndWatchesNoApp() {
        assertTrue(config.contains("""android:isAccessibilityTool="false""""))
        assertFalse(config.contains("android:packageNames"))
        // Final review I6: it needs no events at all (input comes from the Mac), and no flags left over from auto-Start.
        assertFalse(config.contains("android:accessibilityEventTypes"))
        assertFalse(config.contains("flagRetrieveInteractiveWindows"))
        assertFalse(config.contains("flagReportViewIds"))
        assertTrue(config.contains("""android:canPerformGestures="true""""))
        assertTrue(config.contains("""android:canRetrieveWindowContent="true""""))
    }

    @Test fun descriptionNeverMentionsPressingStart() {
        val description = Regex("""<string name="control_service_description">(.*?)</string>""", RegexOption.DOT_MATCHES_ALL)
            .find(File("src/main/res/values/strings.xml").readText())!!.groupValues[1]
        assertFalse(description, Regex("""press(es)? Start|screen-sharing prompt""", RegexOption.IGNORE_CASE).containsMatchIn(description))
    }

    @Test fun noAutoStartCodeLeft() {
        val hits = File("src/main").walkTopDown().filter { it.extension == "kt" }
            .filter { f -> listOf("ConsentMatcher", "autoStart", "STORE_BUILD").any { f.readText().contains(it) } }
            .map { it.path }.toList()
        assertEquals(emptyList<String>(), hits)
    }
}
