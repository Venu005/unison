# Photos fallback (only if Google rejects the Photos and videos declaration)

The first submission ships **"Photos on your Mac"**, which browses the whole gallery from the Mac, together with the Photos and videos declaration in `declarations.md`. If Google rejects that declaration, make this change and resubmit. It drops broad photo access but keeps everything else, including sending photos through the system picker.

## Code (one switch plus the manifest)
1. `android/app/build.gradle.kts`: change `buildConfigField("boolean", "PHOTOS_GALLERY", "true")` to `"false"`. This hides the setup Photos step (`SetupFlow`, through `photosGallery`) and the Settings → Photos row.
2. Stop advertising the feature to the Mac, so its Photos sidebar item stays hidden. In `MacDroidApp.kt`, the `hello` passes `features = Features.SUPPORTED`; pass `Features.SUPPORTED - Features.PHOTOS` when `!BuildConfig.PHOTOS_GALLERY`.
3. `android/app/src/main/AndroidManifest.xml`: delete these three lines:
   ```xml
   <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
   <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
   <uses-permission android:name="android.permission.READ_MEDIA_VISUAL_USER_SELECTED" />
   ```
   Keep `READ_EXTERNAL_STORAGE maxSdkVersion="32"` only if something besides the gallery still reads shared storage on Android 12 and below. Otherwise delete it too.
4. Update `PhotosGalleryFlagTest` to expect `false`, then run the gates and bump `versionCode`.

## Play Console
- Remove the Photos and videos declaration: Play asks for it only while those permissions are present.
- Data safety stays "No data collected", and its notes drop the photos line (see `data-safety.md`, "Fallback").
- Listing: remove "browse your phone's photos from your Mac" from the full description (see `listing.md`).
