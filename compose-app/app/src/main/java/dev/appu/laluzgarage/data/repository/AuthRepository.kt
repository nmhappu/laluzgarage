package dev.appu.laluzgarage.data.repository

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.SetOptions
import dev.appu.laluzgarage.data.model.WorkshopUser
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "LaluzAuth"

@Singleton
class AuthRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
    private val ioDispatcher: CoroutineDispatcher
) {
    private val repositoryScope = CoroutineScope(SupervisorJob() + ioDispatcher)

    private val _currentUser = MutableStateFlow<FirebaseUser?>(auth.currentUser)
    val currentUser: StateFlow<FirebaseUser?> = _currentUser.asStateFlow()

    private val _userProfile = MutableStateFlow<WorkshopUser?>(null)
    val userProfile: StateFlow<WorkshopUser?> = _userProfile.asStateFlow()

    private val _isAuthLoading = MutableStateFlow(true)
    val isAuthLoading: StateFlow<Boolean> = _isAuthLoading.asStateFlow()

    private var profileListenerRegistration: ListenerRegistration? = null

    init {
        auth.addAuthStateListener { firebaseAuth ->
            val user = firebaseAuth.currentUser
            _currentUser.value = user
            if (user == null) {
                profileListenerRegistration?.remove()
                profileListenerRegistration = null
                _userProfile.value = null
                _isAuthLoading.value = false
            } else {
                _isAuthLoading.value = true
                observeProfile(user.uid)
                repositoryScope.launch {
                    syncUserProfile(user)
                }
            }
        }
    }

    private fun observeProfile(uid: String) {
        profileListenerRegistration?.remove()
        profileListenerRegistration = firestore.collection("users").document(uid)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e(TAG, "Error observing user profile: ${error.message}", error)
                    _isAuthLoading.value = false
                    return@addSnapshotListener
                }

                if (snapshot != null && snapshot.exists()) {
                    val user = runCatching { WorkshopUser.fromDocument(snapshot) }.getOrNull()
                    Log.d(TAG, "Observed profile doc for $uid: role=${user?.role}, effectiveRole=${user?.effectiveRole}, tags=${user?.tags}")
                    if (user != null && user.hasActiveRole) {
                        _userProfile.value = user
                        _isAuthLoading.value = false
                    } else {
                        // User doc exists at /users/{uid} but has no effective role yet. Check pre-registered doc by email
                        _userProfile.value = user
                        repositoryScope.launch {
                            checkPreRegisteredEmail(uid)
                        }
                    }
                } else {
                    Log.d(TAG, "Profile doc for $uid does not exist yet. Checking pre-registered doc by email.")
                    repositoryScope.launch {
                        checkPreRegisteredEmail(uid)
                    }
                }
            }
    }

    private suspend fun checkPreRegisteredEmail(uid: String) = withContext(ioDispatcher) {
        val emailLower = auth.currentUser?.email?.lowercase() ?: ""
        if (emailLower.isEmpty()) {
            _isAuthLoading.value = false
            return@withContext
        }
        try {
            val q = firestore.collection("users")
                .whereEqualTo("email", emailLower)
                .limit(5)
                .get()
                .await()

            var foundActiveProfile: WorkshopUser? = null
            for (doc in q.documents) {
                val candidate = WorkshopUser.fromDocument(doc)
                if (candidate.hasActiveRole) {
                    foundActiveProfile = candidate.copy(id = uid)
                    if (doc.id != uid) {
                        Log.i(TAG, "Migrating pre-registered doc ${doc.id} to uid $uid for $emailLower")
                        val userRef = firestore.collection("users").document(uid)
                        val migratedMap = hashMapOf<String, Any>(
                            "id" to uid,
                            "name" to candidate.name.ifEmpty { auth.currentUser?.displayName ?: emailLower.substringBefore("@") },
                            "email" to emailLower,
                            "status" to "online",
                            "updatedAt" to FieldValue.serverTimestamp()
                        )
                        candidate.role?.let { migratedMap["role"] = it }
                        if (candidate.tags.isNotEmpty()) {
                            migratedMap["tags"] = candidate.tags
                        }
                        candidate.pin?.let { migratedMap["pin"] = it }
                        userRef.set(migratedMap, SetOptions.merge()).await()
                        runCatching { doc.reference.delete().await() }
                    }
                    break
                }
            }

            if (foundActiveProfile != null) {
                Log.d(TAG, "Assigned pre-registered profile for $emailLower: effectiveRole=${foundActiveProfile.effectiveRole}")
                _userProfile.value = foundActiveProfile
            } else {
                // If still no role found, trigger syncUserProfile to evaluate Zero-Admin bootstrap
                auth.currentUser?.let { syncUserProfile(it) }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in checkPreRegisteredEmail: ${e.message}", e)
        } finally {
            _isAuthLoading.value = false
        }
    }

    suspend fun syncUserProfile(authUser: FirebaseUser): WorkshopUser? = withContext(ioDispatcher) {
        var attempts = 0
        while (attempts < 3) {
            attempts++
            try {
                return@withContext doSyncUserProfile(authUser)
            } catch (e: Exception) {
                Log.w(TAG, "syncUserProfile attempt $attempts failed: ${e.message}")
                if (attempts < 3) {
                    delay(750L * attempts)
                }
            }
        }
        return@withContext null
    }

    private suspend fun doSyncUserProfile(authUser: FirebaseUser): WorkshopUser? {
        val userRef = firestore.collection("users").document(authUser.uid)
        val emailLower = authUser.email?.lowercase() ?: ""
        val userSnap = userRef.get().await()

        if (!userSnap.exists() && emailLower.isNotEmpty()) {
            val q = firestore.collection("users")
                .whereEqualTo("email", emailLower)
                .limit(5)
                .get()
                .await()

            val preRegDoc = q.documents.firstOrNull { it.id != authUser.uid }
            if (preRegDoc != null) {
                val preRegUser = WorkshopUser.fromDocument(preRegDoc)
                val name = preRegUser.name.ifEmpty {
                    authUser.displayName ?: emailLower.substringBefore("@").ifEmpty { "Team Member" }
                }
                val migratedMap = hashMapOf<String, Any>(
                    "id" to authUser.uid,
                    "name" to name,
                    "email" to emailLower,
                    "status" to "online",
                    "createdAt" to (preRegDoc.get("createdAt") ?: FieldValue.serverTimestamp()),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
                preRegUser.role?.let { migratedMap["role"] = it }
                if (preRegUser.tags.isNotEmpty()) {
                    migratedMap["tags"] = preRegUser.tags
                }
                preRegUser.pin?.let { migratedMap["pin"] = it }

                userRef.set(migratedMap, SetOptions.merge()).await()
                runCatching { preRegDoc.reference.delete().await() }
            } else {
                val newProfile = hashMapOf<String, Any>(
                    "id" to authUser.uid,
                    "name" to (authUser.displayName ?: emailLower.substringBefore("@").ifEmpty { "Team Member" }),
                    "email" to emailLower,
                    "status" to "online",
                    "tags" to emptyList<String>(),
                    "createdAt" to FieldValue.serverTimestamp(),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
                userRef.set(newProfile).await()
            }
        } else if (userSnap.exists()) {
            val currentProfile = runCatching { WorkshopUser.fromDocument(userSnap) }.getOrNull()
            if (currentProfile != null && !currentProfile.hasActiveRole && emailLower.isNotEmpty()) {
                val q = firestore.collection("users")
                    .whereEqualTo("email", emailLower)
                    .limit(5)
                    .get()
                    .await()
                val preRegDoc = q.documents.firstOrNull {
                    it.id != authUser.uid && WorkshopUser.fromDocument(it).hasActiveRole
                }
                if (preRegDoc != null) {
                    val preRegUser = WorkshopUser.fromDocument(preRegDoc)
                    val updates = hashMapOf<String, Any>(
                        "status" to "online",
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                    preRegUser.role?.let { updates["role"] = it }
                    if (preRegUser.tags.isNotEmpty()) updates["tags"] = preRegUser.tags
                    preRegUser.pin?.let { updates["pin"] = it }
                    userRef.set(updates, SetOptions.merge()).await()
                    runCatching { preRegDoc.reference.delete().await() }
                } else {
                    userRef.update(
                        mapOf(
                            "status" to "online",
                            "updatedAt" to FieldValue.serverTimestamp()
                        )
                    ).await()
                }
            } else {
                userRef.update(
                    mapOf(
                        "status" to "online",
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            }
        }

        // Zero-Admin Bootstrap Check
        val freshSnap = userRef.get().await()
        val profile = runCatching { WorkshopUser.fromDocument(freshSnap) }.getOrNull()

        if (profile != null && !profile.hasActiveRole && emailLower.isNotEmpty()) {
            val adminCheck = firestore.collection("users")
                .whereEqualTo("role", "admin")
                .limit(1)
                .get()
                .await()

            var hasAdmin = !adminCheck.isEmpty

            if (!hasAdmin) {
                val tagAdminCheck = firestore.collection("users")
                    .whereArrayContains("tags", "admin")
                    .limit(1)
                    .get()
                    .await()
                hasAdmin = !tagAdminCheck.isEmpty
            }

            if (!hasAdmin) {
                Log.i(TAG, "Zero-Admin condition detected. Promoting $emailLower to initial Admin.")
                userRef.update(
                    mapOf(
                        "role" to "admin",
                        "tags" to FieldValue.arrayUnion("admin"),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()

                runCatching {
                    firestore.collection("settings").document("admin_lock").set(
                        mapOf(
                            "adminUid" to authUser.uid,
                            "adminEmail" to emailLower,
                            "bootstrappedAt" to FieldValue.serverTimestamp()
                        ),
                        SetOptions.merge()
                    ).await()
                }
            }
        }

        val finalSnap = userRef.get().await()
        return runCatching { WorkshopUser.fromDocument(finalSnap) }.getOrNull()
    }

    suspend fun signInWithEmail(email: String, pass: String): Result<Unit> = withContext(ioDispatcher) {
        runCatching {
            auth.signInWithEmailAndPassword(email.trim(), pass).await()
            Unit
        }
    }

    /** Exchanges a Google ID token (from Credential Manager) for a Firebase session. */
    suspend fun signInWithGoogle(idToken: String): Result<Unit> = withContext(ioDispatcher) {
        runCatching {
            val credential = GoogleAuthProvider.getCredential(idToken, null)
            auth.signInWithCredential(credential).await()
            Unit
        }
    }

    suspend fun signOut(): Result<Unit> = withContext(ioDispatcher) {
        runCatching {
            val uid = auth.currentUser?.uid
            if (uid != null) {
                runCatching {
                    firestore.collection("users").document(uid).update(
                        mapOf(
                            "status" to "offline",
                            "updatedAt" to FieldValue.serverTimestamp()
                        )
                    ).await()
                }
            }
            profileListenerRegistration?.remove()
            profileListenerRegistration = null
            auth.signOut()
            _currentUser.value = null
            _userProfile.value = null
        }
    }

    suspend fun refreshProfile(): Result<Unit> = withContext(ioDispatcher) {
        runCatching {
            val user = auth.currentUser ?: return@runCatching
            val uid = user.uid
            val emailLower = user.email?.lowercase() ?: ""
            Log.d(TAG, "refreshProfile initiated for $emailLower (uid: $uid)")

            syncUserProfile(user)

            val snap = firestore.collection("users").document(uid).get().await()
            if (snap.exists()) {
                val profile = WorkshopUser.fromDocument(snap)
                Log.d(TAG, "refreshProfile snap found: role=${profile.role}, effectiveRole=${profile.effectiveRole}")
                if (profile.hasActiveRole) {
                    _userProfile.value = profile
                    return@runCatching
                }
            }

            if (emailLower.isNotEmpty()) {
                val q = firestore.collection("users")
                    .whereEqualTo("email", emailLower)
                    .limit(5)
                    .get()
                    .await()
                for (doc in q.documents) {
                    val candidate = WorkshopUser.fromDocument(doc)
                    if (candidate.hasActiveRole) {
                        val activeUser = candidate.copy(id = uid)
                        _userProfile.value = activeUser
                        val userRef = firestore.collection("users").document(uid)
                        val updateMap = hashMapOf<String, Any>(
                            "id" to uid,
                            "name" to activeUser.name,
                            "email" to emailLower,
                            "status" to "online",
                            "updatedAt" to FieldValue.serverTimestamp()
                        )
                        activeUser.role?.let { updateMap["role"] = it }
                        if (activeUser.tags.isNotEmpty()) updateMap["tags"] = activeUser.tags
                        activeUser.pin?.let { updateMap["pin"] = it }
                        userRef.set(updateMap, SetOptions.merge()).await()
                        runCatching { doc.reference.delete().await() }
                        return@runCatching
                    }
                }
            }
        }
    }
}
