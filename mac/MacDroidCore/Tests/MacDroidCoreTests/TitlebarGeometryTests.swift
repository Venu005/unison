import CoreGraphics
import Testing
@testable import MacDroidCore

/// The pairing-window glitch (Mac 0.4.3/0.4.4): the title-bar strip drawn about 244pt below the top of the window,
/// across the QR code. Frames are AppKit window coordinates (origin bottom-left).
@Suite struct TitlebarGeometryTests {
    let height: CGFloat = 467

    @Test func stripAtTheTopIsInPlace() {
        let strip = CGRect(x: 195, y: height - 52, width: 517, height: 52)
        #expect(!TitlebarGeometry.isMisplaced(strip, windowHeight: height))
    }

    @Test func stripDroppedIntoTheMiddleIsMisplaced() {
        // The screenshot: the strip's top edge 243pt below the window's top.
        let strip = CGRect(x: 195, y: height - 243 - 51, width: 517, height: 51)
        #expect(TitlebarGeometry.isMisplaced(strip, windowHeight: height))
    }

    @Test func fullHeightContainersAreNotStrips() {
        // A view that spans the window (e.g. a container the title bar lives in) says nothing about the strip's position.
        #expect(!TitlebarGeometry.isMisplaced(CGRect(x: 0, y: 0, width: 712, height: height), windowHeight: height))
    }

    @Test func zeroSizedPiecesAreIgnored() {
        #expect(!TitlebarGeometry.isMisplaced(CGRect(x: 0, y: 10, width: 0, height: 0), windowHeight: height))
    }

    @Test func titlebarClassNames() {
        #expect(TitlebarGeometry.isTitlebarPiece(className: "NSTitlebarContainerView"))
        #expect(TitlebarGeometry.isTitlebarPiece(className: "NSTitlebarBackgroundView"))
        #expect(TitlebarGeometry.isTitlebarPiece(className: "NSScrollPocket"))
        #expect(TitlebarGeometry.isTitlebarPiece(className: "NSToolbarView"))
        #expect(!TitlebarGeometry.isTitlebarPiece(className: "NSHostingView"))
        #expect(!TitlebarGeometry.isTitlebarPiece(className: "NSSplitView"))
    }
}
