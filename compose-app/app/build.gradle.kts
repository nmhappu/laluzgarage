plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.google.services)
    alias(libs.plugins.hilt.android)
    alias(libs.plugins.ksp)
    alias(libs.plugins.baselineprofile)
}

/** Version of local builds. Stable: MAJOR.MINOR.PATCH (2.0.0). Dev: MAJOR.MINOR.PATCH-dev[.N] (2.1.0-dev). */
val AppVersion = "2.1.2"

/**
 * versionCode from the version name, so Android's install order matches the tags:
 * MAJOR·10^7 + MINOR·10^5 + PATCH·10^3 + (999 for stable, N for -dev.N, 0 for -dev).
 * 2.1.0-dev → 20100000, 2.1.0-dev.3 → 20100003, 2.1.0 → 20100999.
 */
fun versionCodeOf(version: String): Int {
    val m = Regex("""^(\d+)\.(\d+)\.(\d+)(?:-dev(?:\.(\d+))?)?$""").matchEntire(version)
        ?: throw GradleException("Version \"$version\" must look like 2.0.0 (stable) or 2.1.0-dev / 2.1.0-dev.2 (dev).")
    val (major, minor, patch) = m.destructured
    val pre = m.groupValues[4]
    val isDev = version.contains("-dev")
    require(minor.toInt() < 100 && patch.toInt() < 100) { "Minor and patch must be below 100: $version" }
    val suffix = if (isDev) (pre.toIntOrNull() ?: 0).coerceAtMost(998) else 999
    return major.toInt() * 10_000_000 + minor.toInt() * 100_000 + patch.toInt() * 1_000 + suffix
}

android {
    namespace = "dev.appu.laluzgarage"
    compileSdk = 37

    defaultConfig {
        applicationId = "dev.appu.laluzgarage"
        minSdk = 26
        targetSdk = 35
        // CI passes the release tag as appVersionName; local builds use AppVersion. The updater
        // compares versionName to the tags, and versionCode follows the same order.
        val appVersionName = ((project.findProperty("appVersionName") as String?) ?: AppVersion).removePrefix("v").removePrefix("V")
        versionName = appVersionName
        versionCode = versionCodeOf(appVersionName)

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    // Release signing comes from env vars (CI secrets); local builds without them stay unsigned.
    val releaseKeystore = System.getenv("RELEASE_KEYSTORE_PATH")
    signingConfigs {
        if (releaseKeystore != null) {
            create("release") {
                storeFile = file(releaseKeystore)
                storePassword = System.getenv("RELEASE_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("RELEASE_KEY_ALIAS")
                keyPassword = System.getenv("RELEASE_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            if (releaseKeystore != null) signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isDebuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }

    buildFeatures {
        compose = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

kotlin {
    jvmToolchain(21)
}

composeCompiler {
    stabilityConfigurationFiles.add(layout.projectDirectory.file("compose_stability.conf"))
    // Run with -PcomposeReports to dump stability/skippability reports to build/compose_reports
    if (project.hasProperty("composeReports")) {
        reportsDestination = layout.buildDirectory.dir("compose_reports")
        metricsDestination = layout.buildDirectory.dir("compose_reports")
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    // Compose BOM & UI
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material3.window)
    implementation(libs.androidx.compose.material.icons)
    implementation(libs.coil.compose)
    debugImplementation(libs.androidx.compose.ui.tooling)

    // Navigation & Hilt
    implementation(libs.androidx.navigation.compose)
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.androidx.hilt.navigation.compose)

    // Firebase
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.auth)
    implementation(libs.firebase.firestore)
    implementation(libs.play.services.auth)

    // Google sign-in via Credential Manager
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services)
    implementation(libs.googleid)

    // Baseline profile: installer applies the profile at install/first run
    implementation(libs.androidx.profileinstaller)
    "baselineProfile"(project(":baselineprofile"))

    // Coroutines
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.coroutines.play.services)
}
