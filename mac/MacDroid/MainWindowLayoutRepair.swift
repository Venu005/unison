import AppKit
import Logging
import MacDroidCore
import SwiftUI

/// Workaround and diagnostics for the main window's title-bar strip drawn across the pairing QR code (Mac 0.4.3 and
/// 0.4.4, every unpaired launch; resizing or collapsing the sidebar fixed it). We couldn't reproduce it, so after the
/// window shows we do what users did by hand, a re-layout through a 1pt resize, and log where the title-bar pieces
/// were before and after. Read the log with:
/// `log show --last 10m --info --predicate 'subsystem == "dev.macdroid.mac" AND category == "dev.macdroid.window"'`
@MainActor
enum MainWindowLayoutRepair {
    private static let log = Logger(label: "dev.macdroid.window")
    private static var keyObserver: NSObjectProtocol?

    /// Called each time the main window is put on screen.
    static func windowShown(_ window: NSWindow) {
        DispatchQueue.main.async { repair(window, when: "shown") }
        // Activation-policy changes reach AppKit asynchronously, so look again once they've landed.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { repair(window, when: "settled") }
        // The window can open behind the frontmost app and only become key (and switch the app's policy) later.
        if let keyObserver { NotificationCenter.default.removeObserver(keyObserver) }
        keyObserver = NotificationCenter.default.addObserver(
            forName: NSWindow.didBecomeKeyNotification, object: window, queue: .main
        ) { _ in
            MainActor.assumeIsolated {
                if let keyObserver { NotificationCenter.default.removeObserver(keyObserver) }
                keyObserver = nil
                repair(window, when: "became key")
            }
        }
    }

    private static func repair(_ window: NSWindow, when: String) {
        guard window.isVisible else { return }
        let before = pieces(in: window)
        if !window.styleMask.contains(.fullScreen) {
            let frame = window.frame
            window.setFrame(NSRect(x: frame.minX, y: frame.minY - 1, width: frame.width, height: frame.height + 1), display: true)
            window.setFrame(frame, display: true)
        }
        let after = pieces(in: window)
        let size = "\(Int(window.frame.width))×\(Int(window.frame.height))"
        let (was, now) = (describe(before), describe(after))
        let message: Logger.Message = "Main window \(when) \(size), policy \(NSApp.activationPolicy().rawValue): [\(was)]\(now == was ? "" : " → [\(now)]")"
        if after.contains(where: \.misplaced) {
            log.warning("Title bar still misplaced after re-layout. \(message)")
        } else if before.contains(where: \.misplaced) {
            log.notice("Title bar was misplaced; re-layout fixed it. \(message)")
        } else {
            log.info(message)
        }
    }

    private struct Piece {
        let name: String
        let frame: NSRect
        let misplaced: Bool
    }

    /// Every title-bar or toolbar view in the window's frame view, in window coordinates.
    private static func pieces(in window: NSWindow) -> [Piece] {
        guard let root = window.contentView?.superview else { return [] }
        let height = window.frame.height
        var found: [Piece] = []
        func walk(_ view: NSView) {
            let name = String(describing: type(of: view))
            if TitlebarGeometry.isTitlebarPiece(className: name), !view.isHidden {
                let frame = view.convert(view.bounds, to: nil)
                found.append(Piece(name: name, frame: frame, misplaced: TitlebarGeometry.isMisplaced(frame, windowHeight: height)))
            }
            view.subviews.forEach(walk)
        }
        walk(root)
        return found
    }

    /// The strip itself (the blur and its background), plus anything misplaced; the toolbar's many item views would
    /// push the line past the unified log's length limit.
    private static let stripNames: Set = ["NSTitlebarContainerView", "NSTitlebarBackgroundView", "NSScrollPocket"]

    private static func describe(_ pieces: [Piece]) -> String {
        pieces.filter { stripNames.contains($0.name) || $0.misplaced }.map { piece in
            let f = piece.frame
            return "\(piece.name) y=\(Int(f.minY)) h=\(Int(f.height)) x=\(Int(f.minX)) w=\(Int(f.width))\(piece.misplaced ? " MISPLACED" : "")"
        }
        .joined(separator: "; ")
    }
}

/// Hands the hosting NSWindow to `onWindow` whenever this view is put in a window.
struct WindowReader: NSViewRepresentable {
    let onWindow: @MainActor (NSWindow) -> Void

    func makeNSView(context: Context) -> NSView { ReaderView(onWindow: onWindow) }
    func updateNSView(_ nsView: NSView, context: Context) {}

    private final class ReaderView: NSView {
        let onWindow: @MainActor (NSWindow) -> Void

        init(onWindow: @escaping @MainActor (NSWindow) -> Void) {
            self.onWindow = onWindow
            super.init(frame: .zero)
        }

        @available(*, unavailable)
        required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow()
            if let window { onWindow(window) }
        }
    }
}
