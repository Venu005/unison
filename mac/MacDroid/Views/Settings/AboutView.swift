import AppKit
import SwiftUI

struct AboutView: View {
    /// The website's Support section (Plan 13); until it goes live the link lands on the home page.
    private static let supportURL = URL(string: "https://venu005.github.io/unison/#support")!
    private var version: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?" }
    private var build: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?" }

    var body: some View {
        VStack(spacing: 10) {
            Image(nsImage: NSApp.applicationIconImage)
                .resizable()
                .frame(width: 72, height: 72)
            Text("Unison").font(.title2.weight(.semibold))
            Text("Version \(version) (\(build))").foregroundStyle(.secondary)
            Text("Your Android phone, connected to your Mac — locally, with no account or cloud.")
                .multilineTextAlignment(.center)
                .frame(maxWidth: 360)
            Button("Support Unison") { NSWorkspace.shared.open(Self.supportURL) }
                .buttonStyle(.bordered)
                .padding(.top, 6)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
