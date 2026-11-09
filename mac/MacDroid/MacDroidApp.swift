import Logging
import SwiftUI

@main
struct MacDroidApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var model: AppModel

    init() {
        LoggingSystem.bootstrap(OSLogHandler.init)
        let model = AppModel()
        model.start()
        AppDelegate.servicesProvider = ServicesProvider(model: model)
        // Keep the page last asked for: clicking a notification banner also sends a reopen, which must not
        // replace the Notifications page it just asked for.
        AppDelegate.isPaired = { model.pairedDevice != nil }
        AppDelegate.onReopen = { model.showWindow(model.selectedSection ?? .phone) }
        AppDelegate.onLaunch = {
            if AppDelegate.shouldOpenWindowAtLaunch(paired: model.pairedDevice != nil) { model.showWindow(.phone) }
        }
        AppDelegate.onOpenURLs = { urls in model.openPhoneLinks(urls) }
        _model = State(initialValue: model)
    }

    var body: some Scene {
        MenuBarExtra {
            MenuBarPopover(model: model)
        } label: {
            MenuBarLabel(model: model)
        }
        .menuBarExtraStyle(.window)

        Window("Unison", id: MainWindow.id) {
            MainWindow(model: model)
        }
        .defaultSize(width: 720, height: 480)
        .windowResizability(.contentMinSize)
        .openedOnlyByUnison()
        .commands {
            CommandGroup(replacing: .appSettings) {
                Button("Settings…") { model.showWindow(.general) }
                    .keyboardShortcut(",", modifiers: .command)
            }
        }
    }
}

private extension Scene {
    /// The window opens only through `AppModel.showWindow`, which switches to a Dock app first (`DockPolicy`).
    /// SwiftUI opening or restoring it at launch made the switch happen with the window already on screen, which
    /// broke its title-bar layout until relaunch (closed-test report, Mac 0.4.4).
    func openedOnlyByUnison() -> some Scene {
        if #available(macOS 15.0, *) {
            return self.defaultLaunchBehavior(.suppressed).restorationBehavior(.disabled)
        } else {
            return self
        }
    }
}
