import MacDroidCore
import SwiftUI

/// One cache for every row and card, so an icon shown in the popover and the Notifications page is decoded once.
private let images = DownscaledImages()

/// Outside the generic view, so the background decode doesn't capture `Placeholder`.
private struct Key: Equatable, Sendable {
    let url: URL?
    let pixels: Int
}

/// An image file drawn at `size` points, decoded off the main thread at that size (memory pass); `placeholder` until then.
struct DownscaledImageView<Placeholder: View>: View {
    let url: URL?
    let size: CGFloat
    var fill = false
    @ViewBuilder let placeholder: () -> Placeholder
    @Environment(\.displayScale) private var scale
    @State private var loaded: (key: Key, image: CGImage?)?

    var body: some View {
        let key = Key(url: url, pixels: Int((size * scale).rounded(.up)))
        Group {
            if let image = shown(key) {
                Image(decorative: image, scale: scale)
                    .resizable()
                    .interpolation(.high)
                    .aspectRatio(contentMode: fill ? .fill : .fit)
            } else {
                placeholder()
            }
        }
        .task(id: key) {
            guard let url = key.url, images.cached(url, maxPixels: key.pixels) == nil else { return }
            let image = await Task.detached(priority: .userInitiated) { images.load(url, maxPixels: key.pixels) }.value
            loaded = (key, image)
        }
    }

    private func shown(_ key: Key) -> CGImage? {
        guard let url = key.url else { return nil }
        if let image = images.cached(url, maxPixels: key.pixels) { return image }
        return loaded?.key == key ? loaded?.image : nil
    }
}
