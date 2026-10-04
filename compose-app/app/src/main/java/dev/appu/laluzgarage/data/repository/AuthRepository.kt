package dev.appu.laluzgarage.data.repository

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import dev.appu.laluzgarage.data.model.WorkshopUser
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore
) {
    val currentUser: FirebaseUser? get() = auth.currentUser

    /**
     * Emits real-time auth state updates from FirebaseAuth
     */
    fun authStateFlow(): Flow<FirebaseUser?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener {
            Log.d("LaluzAuth", "AuthStateListener fired: user=${it.currentUser?.uid} (${it.currentUser?.email})")
            trySend(it.currentUser)
        }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    /**
     * Real-time listener for current user's profile document in Firestore: `users/{userId}`
     */
    fun userProfileFlow(userId: String): Flow<WorkshopUser?> = callbackFlow {
        val docRef = firestore.collection("users").document(userId)
        val registration = docRef.addSnapshotListener { snapshot, error ->
            if (error != null) {
                Log.e("LaluzAuth", "userProfileFlow snapshot error for uid=$userId: ${error.message}", error)
                close(error)
                return@addSnapshotListener
            }
            if (snapshot != null && snapshot.exists()) {
                val user = snapshot.toObject(WorkshopUser::class.java)?.copy(id = snapshot.id)
                Log.d("LaluzAuth", "userProfileFlow: received snapshot for uid=$userId -> role=${user?.role}, tags=${user?.tags}, hasActiveRole=${user?.hasActiveRole}")
                trySend(user)
            } else {
                Log.d("LaluzAuth", "userProfileFlow: user doc not found in Firestore for uid=$userId")
                trySend(null)
            }
        }
        awaitClose { registration.remove() }
    }

    /**
     * Synchronizes user profile in Firestore:
     * 1. Creates `users/{uid}` document if missing (complying with firestore.rules isValidWorkshopUser)
     * 2. Migrates pre-registered user document if one was created by manager before first sign-in
     * 3. Performs Zero-Admin Bootstrap if the workshop has no existing administrator
     */
    suspend fun syncUserProfile(user: FirebaseUser): WorkshopUser? {
        val uid = user.uid
        val emailLower = user.email?.lowercase()?.trim() ?: ""
        val displayName = user.displayName?.trim()?.takeIf { it.isNotBlank() }
            ?: emailLower.substringBefore('@').ifBlank { "Team Member" }
        val userDocRef = firestore.collection("users").document(uid)

        Log.d("LaluzAuth", "syncUserProfile: starting for uid=$uid, email=$emailLower, displayName=$displayName")

        try {
            val userSnap = userDocRef.get().await()

            if (!userSnap.exists()) {
                Log.d("LaluzAuth", "syncUserProfile: doc does not exist for uid=$uid. Checking pre-registered...")
                var preRegisteredDocId: String? = null
                var preRegisteredData: Map<String, Any>? = null

                if (emailLower.isNotBlank()) {
                    try {
                        val preQuery = firestore.collection("users")
                            .whereEqualTo("email", emailLower)
                            .limit(1)
                            .get()
                            .await()
                        if (!preQuery.isEmpty) {
                            val firstDoc = preQuery.documents.first()
                            if (firstDoc.id != uid) {
                                preRegisteredDocId = firstDoc.id
                                preRegisteredData = firstDoc.data
                                Log.d("LaluzAuth", "syncUserProfile: found pre-registered doc with id=$preRegisteredDocId")
                            }
                        }
                    } catch (e: Exception) {
                        Log.w("LaluzAuth", "Error checking pre-registered doc: ${e.message}")
                    }
                }

                if (preRegisteredData != null) {
                    val migrated = HashMap<String, Any?>(preRegisteredData).apply {
                        put("id", uid)
                        put("email", emailLower)
                        if (get("name") == null || (get("name") as? String).isNullOrBlank()) {
                            put("name", displayName)
                        }
                        if (get("status") == null) put("status", "offline")
                        if (get("createdAt") == null) put("createdAt", FieldValue.serverTimestamp())
                        put("updatedAt", FieldValue.serverTimestamp())
                    }
                    userDocRef.set(migrated).await()
                    Log.d("LaluzAuth", "syncUserProfile: migrated pre-registered profile to uid=$uid")

                    preRegisteredDocId?.let { oldId ->
                        try {
                            firestore.collection("users").document(oldId).delete().await()
                            Log.d("LaluzAuth", "syncUserProfile: deleted old pre-registered doc $oldId")
                        } catch (e: Exception) {
                            Log.w("LaluzAuth", "Could not delete old pre-registered user doc: $oldId", e)
                        }
                    }
                } else {
                    // New user registration - create initial base profile complying with firestore.rules
                    val initialProfile = hashMapOf<String, Any?>(
                        "id" to uid,
                        "name" to displayName,
                        "email" to emailLower,
                        "status" to "offline",
                        "tags" to emptyList<String>(),
                        "createdAt" to FieldValue.serverTimestamp(),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                    userDocRef.set(initialProfile).await()
                    Log.d("LaluzAuth", "syncUserProfile: created initial profile doc for uid=$uid")
                }
            }

            // Fetch fresh document
            val freshSnap = userDocRef.get().await()
            var profile = freshSnap.toObject(WorkshopUser::class.java)?.copy(id = freshSnap.id)

            // Zero-Admin Bootstrap Check
            if (profile != null && !profile.hasActiveRole) {
                Log.d("LaluzAuth", "syncUserProfile: user has no active role. Checking Zero-Admin condition...")
                try {
                    val adminQuery = firestore.collection("users")
                        .whereEqualTo("role", "admin")
                        .limit(1)
                        .get()
                        .await()
                    var hasAdmin = !adminQuery.isEmpty

                    if (!hasAdmin) {
                        val tagAdminQuery = firestore.collection("users")
                            .whereArrayContains("tags", "admin")
                            .limit(1)
                            .get()
                            .await()
                        hasAdmin = !tagAdminQuery.isEmpty
                    }

                    if (!hasAdmin) {
                        Log.i("LaluzAuth", "Zero-Admin condition detected! Bootstrapping $emailLower ($uid) as initial Admin.")

                        // Promote user first while bootstrap is permitted by firestore.rules
                        userDocRef.update(
                            mapOf(
                                "role" to "admin",
                                "tags" to FieldValue.arrayUnion("admin"),
                                "updatedAt" to FieldValue.serverTimestamp()
                            )
                        ).await()

                        // Create admin lock setting document
                        try {
                            val lockData = hashMapOf(
                                "adminUid" to uid,
                                "adminEmail" to emailLower,
                                "bootstrappedAt" to FieldValue.serverTimestamp()
                            )
                            firestore.collection("settings").document("admin_lock")
                                .set(lockData, SetOptions.merge())
                                .await()
                            Log.d("LaluzAuth", "syncUserProfile: created settings/admin_lock successfully")
                        } catch (lockErr: Exception) {
                            Log.w("LaluzAuth", "Bootstrap admin lock notice: ${lockErr.message}")
                        }

                        profile = profile.copy(
                            role = "admin",
                            tags = if (profile.tags.contains("admin")) profile.tags else profile.tags + "admin"
                        )
                    } else {
                        Log.d("LaluzAuth", "syncUserProfile: workshop already has an admin. User awaits role assignment.")
                    }
                } catch (bootstrapErr: Exception) {
                    Log.w("LaluzAuth", "Zero-admin check notice: ${bootstrapErr.message}", bootstrapErr)
                }
            }

            Log.d("LaluzAuth", "syncUserProfile complete: role=${profile?.role}, hasActiveRole=${profile?.hasActiveRole}")
            return profile
        } catch (e: Exception) {
            Log.e("LaluzAuth", "syncUserProfile failed: ${e.message}", e)
            return null
        }
    }

    /**
     * Fetches all registered workshop technicians and advisors for the PIN Switcher
     */
    suspend fun getWorkshopStaff(): List<WorkshopUser> {
        val snapshot = firestore.collection("users").get().await()
        return snapshot.documents.mapNotNull { doc ->
            doc.toObject(WorkshopUser::class.java)?.copy(id = doc.id)
        }
    }

    suspend fun signInWithEmail(email: String, pass: String): FirebaseUser {
        val result = auth.signInWithEmailAndPassword(email.trim(), pass).await()
        return result.user ?: throw IllegalStateException("Firebase user is null after sign-in")
    }

    suspend fun signInWithGoogle(idToken: String): FirebaseUser {
        val credential = com.google.firebase.auth.GoogleAuthProvider.getCredential(idToken, null)
        val result = auth.signInWithCredential(credential).await()
        return result.user ?: throw IllegalStateException("Firebase user is null after Google sign-in")
    }

    fun signOut() {
        auth.signOut()
    }
}
