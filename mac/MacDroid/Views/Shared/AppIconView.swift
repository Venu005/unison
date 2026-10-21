import AppKit
import SwiftUI

/// A phone app's icon from the icon cache, or a placeholder.
struct AppIconView: View {
    let url: URL?
    var size: CGFloat = 20

    var body: some View {
        DownscaledImageView(url: url, size: size) {
            Image(systemName: "app.fill")
                .resizable()
                .foregroundStyle(.secondary)
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.22))
    }
}
