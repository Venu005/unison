import AppKit
import Logging
import SwiftUI

/// The menu-bar icon. Lives for the whole app session, so it also owns opening the main window.
struct MenuBarLabel: View {
    let model: AppModel
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        Image(systemName: model.phoneStatus.symbol)
            .task {
                // The status item can appear a moment after its label; keep looking briefly.
                for _ in 0..<20 {
                    if StatusItemDropTarget.install(model: model) { return }
                    try? await Task.sleep(for: .milliseconds(250))
                }
                Logger(label: "dev.macdroid.menubar").warning("Menu-bar icon not found; dropping files on it won't work")
            }
            .task {
                // A request made before this label appeared (at launch) must not be lost.
                if model.windowRequest != nil {
                    DockPolicy.prepareToShowWindow()
                    openWindow(id: MainWindow.id)
                    NSApp.activate()
                }
            }
            .onChange(of: model.windowRequest) { _, request in
                guard request != nil else { return }
                DockPolicy.prepareToShowWindow()
                openWindow(id: MainWindow.id)
                NSApp.activate()
            }
    }
}
