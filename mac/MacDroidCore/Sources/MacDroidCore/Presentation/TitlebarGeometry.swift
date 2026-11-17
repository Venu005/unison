import CoreGraphics

/// Spots the main window's title-bar strip drawn in the wrong place.
///
/// Users on Mac 0.4.3 and 0.4.4 saw the strip (blur plus separator line) about 244pt below the top of the window,
/// across the pairing QR code, on every unpaired launch; resizing or collapsing the sidebar put it back. We couldn't
/// reproduce it, so the app logs these checks at launch and re-lays the window out (see `MainWindowLayoutRepair`).
public enum TitlebarGeometry {
    /// The title bar plus a toolbar is at most about 52pt; anything taller than this isn't a strip.
    public static let topBand: CGFloat = 120

    /// Whether AppKit's view class is part of the title bar or toolbar decoration.
    public static func isTitlebarPiece(className: String) -> Bool {
        ["Titlebar", "TitleBar", "ScrollPocket", "Toolbar"].contains { className.contains($0) }
    }

    /// Whether a title-bar strip sits below the window's top band. `frame` is in window coordinates (origin
    /// bottom-left). Views taller than the band, and empty ones, aren't strips, so they never count.
    public static func isMisplaced(_ frame: CGRect, windowHeight: CGFloat) -> Bool {
        guard frame.width > 0, frame.height > 0, frame.height <= topBand else { return false }
        return frame.minY < windowHeight - topBand
    }
}
