package dev.appu.laluzgarage.di

import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.PersistentCacheSettings
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import javax.inject.Singleton

const val FIRESTORE_DATABASE_ID = "ai-studio-68b1ba2c-7611-4e4f-b6eb-ac12f212fa4e"

/** On-disk Firestore cache budget; least-recently-used documents are evicted past this. */
private const val FIRESTORE_CACHE_BYTES = 100L * 1024 * 1024

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideFirebaseAuth(): FirebaseAuth = FirebaseAuth.getInstance()

    @Provides
    @Singleton
    fun provideFirebaseFirestore(): FirebaseFirestore =
        FirebaseFirestore.getInstance(FirebaseApp.getInstance(), FIRESTORE_DATABASE_ID).apply {
            // Offline-first: every query result is mirrored to disk, so listeners open from the
            // cache on a cold start with no network, and writes queue until the device reconnects.
            // This provider is the only way the app gets Firestore, so the settings land first.
            firestoreSettings = FirebaseFirestoreSettings.Builder()
                .setLocalCacheSettings(
                    PersistentCacheSettings.newBuilder().setSizeBytes(FIRESTORE_CACHE_BYTES).build()
                )
                .build()
        }

    @Provides
    @Singleton
    fun provideIoDispatcher(): CoroutineDispatcher = Dispatchers.IO
}
