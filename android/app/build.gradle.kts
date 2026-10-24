import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

// Release signing for Google Play (Plan 14): the upload key's details live in android/keystore.properties, which is
// gitignored. Without it, debug and the gates still build; release tasks stop with a clear message.
val uploadKey: Properties? = rootProject.file("keystore.properties").takeIf { it.exists() }
    ?.let { f -> Properties().apply { f.inputStream().use { load(it) } } }

android {
    namespace = "dev.macdroid.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "dev.macdroid.app"
        minSdk = 29
        targetSdk = 37
        versionCode = 7
        versionName = "0.5.1"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        // "Photos on your Mac" (broad photo access). docs/play/photos-fallback.md turns it off if Play rejects the declaration.
        buildConfigField("boolean", "PHOTOS_GALLERY", "true")
    }
    signingConfigs {
        if (uploadKey != null) {
            create("upload") {
                storeFile = file(uploadKey.getProperty("storeFile").replaceFirst("~", System.getProperty("user.home")))
                storePassword = uploadKey.getProperty("storePassword")
                keyAlias = uploadKey.getProperty("keyAlias")
                keyPassword = uploadKey.getProperty("keyPassword")
            }
        }
    }
    buildTypes {
        release {
            signingConfig = signingConfigs.findByName("upload")
        }
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    packaging {
        resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" }
    }
}

dependencies {
    implementation(project(":core"))
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.10.2")
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.core:core-ktx:1.19.1")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.11.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.11.0")
    implementation("androidx.camera:camera-camera2:1.6.2")
    implementation("androidx.camera:camera-lifecycle:1.6.2")
    implementation("androidx.camera:camera-view:1.6.2")
    implementation("com.google.zxing:core:3.5.3")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test:runner:1.7.0")
    androidTestImplementation("com.squareup.okhttp3:mockwebserver3:5.5.0")
    androidTestImplementation("com.squareup.okhttp3:okhttp-tls:5.5.0")
}

// A release build must never come out unsigned or debug-signed: stop early and say what's missing.
tasks.configureEach {
    if (uploadKey == null && name.endsWith("Release") && (name.startsWith("bundle") || name.startsWith("package") || name.startsWith("assemble"))) {
        doFirst { throw GradleException("Release signing needs android/keystore.properties (see DEV-GUIDE: Releasing on Google Play)") }
    }
}
