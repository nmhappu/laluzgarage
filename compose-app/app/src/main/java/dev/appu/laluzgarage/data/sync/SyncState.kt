package dev.appu.laluzgarage.data.sync

/** Steps of a sync run, in the order the top bar shows them. */
enum class SyncPhase { IDLE, SYNCING, LOADING, DONE, OFFLINE }

data class SyncUiState(
    val phase: SyncPhase = SyncPhase.IDLE,
    /** 0..1 for the determinate bar under the top bar. */
    val progress: Float = 0f
) {
    /** Work is in flight (spinner showing). */
    val isActive: Boolean get() = phase == SyncPhase.SYNCING || phase == SyncPhase.LOADING

    /** Anything to show at all; false once the run has faded away. */
    val isVisible: Boolean get() = phase != SyncPhase.IDLE

    val label: String
        get() = when (phase) {
            SyncPhase.SYNCING -> "Syncing data"
            SyncPhase.LOADING -> "Loading data"
            SyncPhase.DONE -> "All set"
            SyncPhase.OFFLINE -> "Offline · saved data"
            SyncPhase.IDLE -> ""
        }
}
