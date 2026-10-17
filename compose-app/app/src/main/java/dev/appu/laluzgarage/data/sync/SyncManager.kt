package dev.appu.laluzgarage.data.sync

import android.os.SystemClock
import android.util.Log
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Source
import dev.appu.laluzgarage.data.repository.AuthRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull
import java.util.concurrent.atomic.AtomicBoolean
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "SyncManager"

/** Share of the progress bar given to the server fetch; the rest is the UI hydrating. */
private const val FETCH_SHARE = 0.75f

/** Floors per phase so each label is readable even when the cache makes the work instant. */
private const val MIN_SYNCING_MS = 700L
private const val MIN_LOADING_MS = 550L

/** How long "All set" / the offline note stays before fading away. */
private const val HOLD_MS = 1_200L

private const val LOAD_TIMEOUT_MS = 8_000L

/**
 * Pulls the cached collections from the server and reports progress for the top-bar indicator.
 * Runs once per process (cold start) and again on demand (pull to refresh on the dashboard).
 */
@Singleton
class SyncManager @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val authRepository: AuthRepository,
    ioDispatcher: CoroutineDispatcher
) {
    private val scope = CoroutineScope(SupervisorJob() + ioDispatcher)

    private val _state = MutableStateFlow(SyncUiState())
    val state: StateFlow<SyncUiState> = _state.asStateFlow()

    /** Collections whose live listener has delivered a snapshot since the current run started. */
    private val delivered = MutableStateFlow(emptySet<String>())
    private val running = AtomicBoolean(false)
    private val coldStartHandled = AtomicBoolean(false)

    /**
     * The cold-start sync. Called when the signed-in app UI first shows, so the run plays out on
     * screen rather than behind the splash; once per process, so activity recreation and coming
     * back to the dashboard from another screen don't re-sync.
     */
    fun onAppStart() {
        if (authRepository.currentUser.value == null) return
        if (!coldStartHandled.compareAndSet(false, true)) return
        scope.launch { runSync() }
    }

    /** Force refresh; ignored while a run is already in flight. */
    fun refresh() {
        if (authRepository.currentUser.value == null) return
        scope.launch { runSync() }
    }

    /** ServiceRepository's listeners report here so "Loading data" waits for real data. */
    fun onSnapshotDelivered(collection: String) {
        delivered.update { it + collection }
    }

    private suspend fun runSync() {
        if (!running.compareAndSet(false, true)) return
        try {
            delivered.value = emptySet()
            _state.value = SyncUiState(SyncPhase.SYNCING, 0f)

            // Syncing: read every collection from the server in parallel. Each read lands in the
            // disk cache, which also pushes it to the live listeners.
            val syncStart = SystemClock.elapsedRealtime()
            val total = SyncCollections.all.size
            var fetched = 0
            var reachedServer = true
            coroutineScope {
                SyncCollections.all
                    .map { name -> async { fetchFromServer(name) } }
                    .forEach { task ->
                        if (!task.await()) reachedServer = false
                        fetched++
                        _state.update { it.copy(progress = FETCH_SHARE * fetched / total) }
                    }
            }
            holdAtLeast(syncStart, MIN_SYNCING_MS)

            if (!reachedServer) {
                finish(SyncPhase.OFFLINE)
                return
            }

            // Loading: wait for the listeners to hand the fresh snapshot to the UI.
            _state.value = SyncUiState(SyncPhase.LOADING, FETCH_SHARE)
            val loadStart = SystemClock.elapsedRealtime()
            withTimeoutOrNull(LOAD_TIMEOUT_MS) {
                delivered.first { it.containsAll(SyncCollections.all) }
            }
            _state.update { it.copy(progress = 1f) }
            holdAtLeast(loadStart, MIN_LOADING_MS)

            finish(SyncPhase.DONE)
        } catch (e: CancellationException) {
            _state.value = SyncUiState()
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "Sync failed: ${e.message}", e)
            finish(SyncPhase.OFFLINE)
        } finally {
            running.set(false)
        }
    }

    /** Shows the final state (tick or offline note), then fades the indicator away. */
    private suspend fun finish(phase: SyncPhase) {
        _state.value = SyncUiState(phase, 1f)
        delay(HOLD_MS)
        _state.value = SyncUiState()
    }

    /** True when the server answered; otherwise the cached copy stays in use. */
    private suspend fun fetchFromServer(collection: String): Boolean = try {
        SyncCollections.query(firestore, collection).get(Source.SERVER).await()
        true
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Log.w(TAG, "$collection: server unreachable, keeping cached copy (${e.message})")
        false
    }

    private suspend fun holdAtLeast(startedAt: Long, minMs: Long) {
        val remaining = minMs - (SystemClock.elapsedRealtime() - startedAt)
        if (remaining > 0) delay(remaining)
    }
}
