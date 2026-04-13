# Editor Frontend Flow Documentation

This document explains only how the editor frontend works and how users move through the feature.
It is intentionally product/flow focused (not API and not low-level code details).

## What the editor does

The editor lets a user:
- load their profile photo as the base image,
- choose a hairstyle overlay,
- auto-place the hairstyle on the face,
- manually adjust position/scale/rotation if needed,
- preview different hair colors.

## Main screen structure

The editor screen is split into three areas:

- **Left panel**: style library, upload, fit controls, landmark calibration.
- **Center canvas**: live preview of base photo + hairstyle overlay.
- **Right panel**: discovery/trending/challenges (supporting content).

There is also a bottom variation tray for quick style selection.

## User flow (step by step)

1. User enters editor.
2. Editor checks for an existing onboarding photo.
3. User picks a hairstyle (or uploads one).
4. Overlay appears on the canvas and fitting logic runs automatically.
5. User refines result:
   - drag/scale/rotate manually, or
   - tune fit sliders, or
   - use landmark calibration for harder styles.
6. User switches colors to preview different looks.
7. User resets when needed and continues trying variations.

## Fitting flow priority

At any moment, the hairstyle position follows this order:

1. **Manual adjust** (if user already moved/scaled/rotated it).
2. **Landmark correspondence fit** (if enough calibration points exist).
3. **Auto-fit** (face detection + hairstyle default fit settings).
4. **Manual-only fallback** (when face is not detected).

This priority is why a user may see auto-fit first, then a manual state after interaction.

## Auto reposition feature

Auto reposition (auto-fit) tries to place the hairstyle automatically based on the face in the base photo.

What users experience:
- when detection works, overlay snaps near a realistic position,
- face tilt influences the initial hair angle,
- fit status appears in the UI (auto-fit / detecting / face-not-detected).

What affects quality:
- clear, front-facing source photos,
- good hairstyle PNG crop/transparent edges,
- hairstyle default fit settings.

## Manual reposition feature

If auto-fit is imperfect, the user can manually reposition on the canvas:

- drag to move,
- wheel to resize,
- shift + wheel to rotate,
- reset button to return to computed fit.

Once manual adjustment happens, the editor stays in manual mode until reset.

## Hair fit controls (left panel)

The fit controls allow per-hairstyle tuning of how auto-fit behaves.
These controls are for improving default placement quality for a specific hairstyle image.

Typical use:
- adjust one hairstyle until it looks correct,
- optionally apply the same tuning to other similar hairstyles,
- reset if tuning is overdone.

## Landmark calibration (advanced fit)

Landmark calibration is used for difficult overlays that do not fit well with normal auto-fit.

User marks semantic points on the hairstyle image (eyes, nose, chin, forehead, etc.).
When enough points are set, the editor switches to correspondence-based fitting for better alignment.

## Color preview behavior

Color tool applies a visual tint over the selected hairstyle overlay.
It is a live preview layer on top of the hairstyle image and updates instantly on swatch change.

## Persistence behavior in frontend

Frontend currently keeps:
- selected style/color and canvas interaction state during the session,
- fit tuning and calibration overrides in local browser storage.

So users can keep tuning behavior between refreshes on the same device/browser.

## Current frontend limitations

- Style and color are the main completed interaction flows.
- Some toolbar items are present as placeholders.
- Fit quality can vary with poor source photos or low-quality overlay images.
