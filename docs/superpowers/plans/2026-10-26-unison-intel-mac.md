# Intel Mac Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Produce a validated universal Mac app and local DMG for Intel testing.

**Architecture:** Explicit universal Release settings in XcodeGen, plus an architecture gate in the existing release script. Preserve native Debug builds and all application behavior.

**Tech Stack:** XcodeGen, Xcode, Bash, lipo, codesign, Swift Testing.

**Spec:** `docs/superpowers/specs/2026-10-26-unison-intel-mac-design.md`

## Global Constraints
- macOS minimum 14.0; architectures arm64 and x86_64.
- Existing signing, pairing and protocol unchanged; no dependencies.
- No version bump, publish, install or merge.

## Review Focus
- A host-specific build must not silently yield a single-architecture release.
- Failed validation must stop before DMG creation/publication.
- Paths containing spaces must work.
- The staged DMG must contain the validated signed app.
- Native Debug development must remain available; physical Intel results stay pending.

### Task 1: Universal release and documentation

**Files:** `mac/project.yml`, `scripts/make-release.sh`, optionally a focused architecture-check helper in `scripts/`, and `docs/handoff/{CHANGELOG,STATUS,DEV-GUIDE,DECISIONS,ROADMAP,README}.md`.

**Interfaces:** Existing `scripts/make-release.sh [--dry-run]` remains the entry point; validation invokes `lipo "<executable>" -verify_arch "<architecture>"` separately for `arm64` and `x86_64` (the installed lipo rejects a multi-architecture invocation).

- [x] Confirm the existing Release executable is arm64-only (baseline failure).
- [x] Set both Release architectures and disable ONLY_ACTIVE_ARCH; use generic macOS in the release build command.
- [x] Add a fail-fast architecture check before staging/packaging, exercised with real thin and universal binaries (no implementation-mirroring tests).
- [x] Update the handoff with branch, intent, commands, verification status and physical Intel checklist.
- [x] Controller: run all required gates and the local dry-run release, inspect slices/signature/package, try x86_64 tests under existing Rosetta, and record actual results.
- [x] Fresh reviewer: check spec compliance and code quality; address actionable findings.

Baseline on the unchanged tree: 371 Swift tests passed; Mac Debug build and Android gates passed. Gradle reported existing deprecations; Xcode emitted known environment/AppIntents metadata logs.
