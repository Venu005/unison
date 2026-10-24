import AppKit

/// Files dropped on the menu-bar icon are sent to the phone.
/// The popover can't take a drag from Finder: pressing the mouse in Finder to start the drag makes Unison inactive, and
/// SwiftUI closes a MenuBarExtra window as soon as that happens. So the icon itself is the drop target.
/// MenuBarExtra doesn't expose its status item, so this finds the item's button in the app's status-bar window.
@MainActor
enum StatusItemDropTarget {
    /// Returns false while the status item doesn't exist yet. Calling it again once installed does nothing.
    @discardableResult
    static func install(model: AppModel) -> Bool {
        guard let button = statusButton() else { return false }
        if !button.subviews.contains(where: { $0 is StatusItemDropView }) {
            let view = StatusItemDropView(model: model)
            view.frame = button.bounds
            view.autoresizingMask = [.width, .height]
            button.addSubview(view)
        }
        return true
    }

    private static func statusButton() -> NSStatusBarButton? {
        NSApp.windows.lazy
            .filter { $0.className == "NSStatusBarWindow" }
            .compactMap { $0.contentView.flatMap(findButton) }
            .first
    }

    private static func findButton(in view: NSView) -> NSStatusBarButton? {
        view as? NSStatusBarButton ?? view.subviews.lazy.compactMap(findButton).first
    }
}

/// Covers the icon to receive drags. Mouse clicks aren't handled here, so they travel up the responder chain to the
/// button underneath and still open the popover.
private final class StatusItemDropView: NSView {
    private let model: AppModel

    init(model: AppModel) {
        self.model = model
        super.init(frame: .zero)
        registerForDraggedTypes([.fileURL])
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    private var button: NSButton? { superview as? NSButton }

    override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation {
        guard model.canSendFiles else { return [] }
        button?.highlight(true)
        return .copy
    }

    override func draggingExited(_ sender: NSDraggingInfo?) { button?.highlight(false) }

    override func draggingEnded(_ sender: NSDraggingInfo) { button?.highlight(false) }

    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool {
        button?.highlight(false)
        guard model.canSendFiles else { return false }
        let urls = DroppedFiles.urls() // read at drop time, when the sandbox grants access
        guard !urls.isEmpty else { return false }
        model.sendFiles(urls)
        return true
    }
}
