// Renders an SVG to a PNG using AppKit's built-in SVG support: square at <pixels>, or <pixels> wide and [height] tall.
// Usage: swift scripts/render-icon.swift <input.svg> <output.png> <pixels> [height]
import AppKit

let args = CommandLine.arguments
guard args.count == 4 || args.count == 5, let pixels = Int(args[3]), let height = args.count == 5 ? Int(args[4]) : pixels else {
    FileHandle.standardError.write(Data("usage: render-icon.swift <in.svg> <out.png> <pixels> [height]\n".utf8))
    exit(2)
}
guard let image = NSImage(contentsOf: URL(fileURLWithPath: args[1])) else {
    FileHandle.standardError.write(Data("could not load \(args[1])\n".utf8))
    exit(1)
}
guard let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: pixels, pixelsHigh: height,
                                 bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                 colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0) else { exit(1) }
rep.size = NSSize(width: pixels, height: height)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
NSGraphicsContext.current?.imageInterpolation = .high
image.draw(in: NSRect(x: 0, y: 0, width: pixels, height: height))
NSGraphicsContext.restoreGraphicsState()
guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
try png.write(to: URL(fileURLWithPath: args[2]))
