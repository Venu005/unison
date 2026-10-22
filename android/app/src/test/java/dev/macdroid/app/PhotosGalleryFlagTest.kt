package dev.macdroid.app

import org.junit.Assert.assertTrue
import org.junit.Test

/** "Photos on your Mac" ships on; turning it off is the prepared fallback if Play rejects the photos declaration. */
class PhotosGalleryFlagTest {
    @Test fun galleryOnByDefault() = assertTrue(BuildConfig.PHOTOS_GALLERY)
}
