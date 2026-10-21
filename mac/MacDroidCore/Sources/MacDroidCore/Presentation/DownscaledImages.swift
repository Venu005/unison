import CoreGraphics
import Foundation
import ImageIO

/// Image files decoded at the size they're drawn, kept in memory (memory pass). Rows and cards used to call
/// `NSImage(contentsOf:)` in `body`, which read the file again on every redraw and decoded it at full size
/// (a 5K screenshot in the clipboard history is about 60 MB for a 28 pt square).
/// Callers' files are named by their content hash or item id, so a URL never changes picture.
public final class DownscaledImages: @unchecked Sendable { // NSCache is thread-safe
    private let cache = NSCache<NSString, CGImage>()

    public init(countLimit: Int = 300, costLimit: Int = 32 * 1024 * 1024) {
        cache.countLimit = countLimit
        cache.totalCostLimit = costLimit
    }

    /// The decode from an earlier `load`, if it's still in memory. Cheap enough for `body`.
    public func cached(_ url: URL, maxPixels: Int) -> CGImage? {
        cache.object(forKey: Self.key(url, maxPixels))
    }

    /// Decodes and keeps the result. Reads the file, so call it off the main thread.
    public func load(_ url: URL, maxPixels: Int) -> CGImage? {
        if let image = cached(url, maxPixels: maxPixels) { return image }
        guard let image = Self.decode(url, maxPixels: maxPixels) else { return nil }
        cache.setObject(image, forKey: Self.key(url, maxPixels), cost: image.bytesPerRow * image.height)
        return image
    }

    /// The file's image with its longer side at most `maxPixels`, never enlarged; nil if it can't be read.
    public static func decode(_ url: URL, maxPixels: Int) -> CGImage? {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary) else { return nil }
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceThumbnailMaxPixelSize: max(1, maxPixels),
        ]
        return CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
    }

    private static func key(_ url: URL, _ maxPixels: Int) -> NSString {
        "\(maxPixels)@\(url.path(percentEncoded: false))" as NSString
    }
}
