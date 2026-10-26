# Intel Mac support

## Intent and scope
Ship one Unison Mac download for Apple silicon and Intel Macs running macOS 14 or later. The owner requested Intel support after closed-test feedback. Keep the existing native app, signing identity, bundle identifier, pairing data and wire protocol.

## Design
- Release builds explicitly include `arm64` and `x86_64`, with active-architecture-only disabled. Debug builds can stay native for development speed.
- The release script builds for generic macOS and verifies the resulting app includes both architectures before creating or publishing the DMG. A missing architecture is a release failure, with a useful diagnostic.
- No version bump or public release in this change. Prepare a local dry-run DMG for review/testing. Do not replace the installed app.
- Keep macOS 14.0 as the deployment floor. Older Intel Macs unable to run Sonoma are outside this scope.
- No Windows/Linux work, protocol changes, new dependencies or unrelated UI fixes.

## Verification
Inspect generated Release settings, build both slices, check the signed executable with `lipo` and `codesign`, and inspect the packaged app. Check that an existing arm64-only executable is rejected by the release validation. Run the repository's Swift, Mac and Android gates. If Rosetta is already installed, run the core tests as x86_64 too; do not install it automatically.

## Hands-on release checklist
An Intel tester must install the candidate on macOS 14+, pair, reconnect, send a file each way, sync clipboard/notifications, browse photos, and try mirroring/audio/control and calls. Compilation or Rosetta results are not a claim of physical Intel verification. Publish only on the owner's instruction.
