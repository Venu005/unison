import CoreGraphics
import Foundation
import ImageIO
import Testing
import UniformTypeIdentifiers
@testable import MacDroidCore

struct DownscaledImagesTests {
    private func writePNG(width: Int, height: Int) throws -> URL {
        let context = try #require(CGContext(
            data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ))
        context.setFillColor(red: 1, green: 0, blue: 0, alpha: 1)
        context.fill(CGRect(x: 0, y: 0, width: width, height: height))
        let image = try #require(context.makeImage())
        let url = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString + ".png")
        let destination = try #require(CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil))
        CGImageDestinationAddImage(destination, image, nil)
        #expect(CGImageDestinationFinalize(destination))
        return url
    }

    @Test func aLargeImageIsDecodedAtTheSizeItIsDrawn() throws {
        let url = try writePNG(width: 4000, height: 2000)
        defer { try? FileManager.default.removeItem(at: url) }
        let image = try #require(DownscaledImages.decode(url, maxPixels: 64))
        #expect(image.width == 64)
        #expect(image.height == 32)
    }

    @Test func aSmallImageIsNotEnlarged() throws {
        let url = try writePNG(width: 20, height: 20)
        defer { try? FileManager.default.removeItem(at: url) }
        let image = try #require(DownscaledImages.decode(url, maxPixels: 64))
        #expect(image.width <= 20)
    }

    @Test func aMissingOrBrokenFileGivesNil() throws {
        let missing = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString + ".png")
        #expect(DownscaledImages.decode(missing, maxPixels: 64) == nil)
        let broken = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString + ".png")
        try Data("not a png".utf8).write(to: broken)
        defer { try? FileManager.default.removeItem(at: broken) }
        #expect(DownscaledImages.decode(broken, maxPixels: 64) == nil)
    }

    @Test func loadKeepsTheDecodeForLaterDrawsAtThatSize() throws {
        let url = try writePNG(width: 200, height: 200)
        let images = DownscaledImages()
        #expect(images.cached(url, maxPixels: 40) == nil)
        let loaded = try #require(images.load(url, maxPixels: 40))
        try FileManager.default.removeItem(at: url) // later draws don't read the file again
        #expect(images.cached(url, maxPixels: 40) === loaded)
        #expect(images.cached(url, maxPixels: 80) == nil)
    }
}
