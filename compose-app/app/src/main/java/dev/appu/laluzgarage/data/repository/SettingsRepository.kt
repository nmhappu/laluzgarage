package dev.appu.laluzgarage.data.repository

import android.content.Context
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import dagger.hilt.android.qualifiers.ApplicationContext
import dev.appu.laluzgarage.data.model.UserRole
import dev.appu.laluzgarage.data.model.WorkshopUser
import dev.appu.laluzgarage.ui.services.DEFAULT_DELIVERY_TEMPLATE
import dev.appu.laluzgarage.ui.services.DEFAULT_INTAKE_TEMPLATE
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONArray
import javax.inject.Inject
import javax.inject.Singleton

data class WhatsAppPresets(
    val intakeTemplate: String = DEFAULT_INTAKE_TEMPLATE,
    val deliveryTemplate: String = DEFAULT_DELIVERY_TEMPLATE
)

/**
 * Settings data shared with the web app: the team (`users`), WhatsApp templates
 * (`settings/whatsapp`) and the workshop's own tag list. Mirrors useWorkshopUsers,
 * useWorkshopTags and whatsappPresetService in the web app.
 */
@Singleton
class SettingsRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val ioDispatcher: CoroutineDispatcher,
    @ApplicationContext context: Context
) {
    private val prefs = context.getSharedPreferences("laluz_prefs", Context.MODE_PRIVATE)

    /** Live team list, sorted by name like the web app's Team view. */
    fun usersStream(): Flow<List<WorkshopUser>> = callbackFlow {
        val registration = firestore.collection(USERS).addSnapshotListener { snap, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            val users = snap?.documents.orEmpty()
                .map { WorkshopUser.fromDocument(it) }
                .sortedBy { it.name.lowercase() }
            trySend(users)
        }
        awaitClose { registration.remove() }
    }

    /**
     * Saves a member the way the web app does: the role is mirrored into the legacy tags
     * (admin / tech / assistant) so older clients and the security rules agree.
     */
    suspend fun saveUser(
        id: String,
        name: String,
        email: String,
        role: UserRole?,
        pin: String,
        tags: List<String>
    ): Result<Unit> = withContext(ioDispatcher) {
        runCatching {
            val cleanEmail = email.trim().lowercase()
            val finalName = name.trim().ifEmpty { cleanEmail.substringBefore("@") }
            val merged = LinkedHashSet(tags.filterNot { it in RoleTags })
            when (role) {
                UserRole.ADMIN -> merged += "admin"
                UserRole.TECHNICIAN -> merged += "tech"
                UserRole.ASSISTANT -> merged += "assistant"
                null -> Unit
            }
            val data = hashMapOf<String, Any?>(
                "name" to finalName,
                "email" to cleanEmail,
                "role" to role?.value,
                "pin" to pin.ifEmpty { null },
                "tags" to merged.toList(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
            firestore.collection(USERS).document(id).set(data, SetOptions.merge()).await()
            Unit
        }
    }

    suspend fun deleteUser(id: String): Result<Unit> = withContext(ioDispatcher) {
        runCatching {
            firestore.collection(USERS).document(id).delete().await()
            Unit
        }
    }

    // ---- Tags ----

    private val _customTags = MutableStateFlow(readCustomTags())

    /** Tags created on this device that no member carries yet (the web app keeps the same list locally). */
    val customTags: StateFlow<List<String>> = _customTags.asStateFlow()

    private fun readCustomTags(): List<String> = runCatching {
        val raw = prefs.getString(KEY_CUSTOM_TAGS, null) ?: return@runCatching listOf("tech")
        val arr = JSONArray(raw)
        List(arr.length()) { arr.getString(it) }
    }.getOrDefault(listOf("tech"))

    private fun writeCustomTags(tags: List<String>) {
        _customTags.value = tags
        prefs.edit().putString(KEY_CUSTOM_TAGS, JSONArray(tags).toString()).apply()
    }

    fun addCustomTag(tag: String) = writeCustomTags((_customTags.value + tag).distinct())

    /** Removes the tag from this device's list and from every member that carries it. */
    suspend fun deleteTag(tag: String, users: List<WorkshopUser>): Result<Unit> = withContext(ioDispatcher) {
        writeCustomTags(_customTags.value - tag)
        runCatching {
            users.filter { tag in it.tags }.forEach { u ->
                firestore.collection(USERS).document(u.id).update(
                    mapOf("tags" to u.tags - tag, "updatedAt" to FieldValue.serverTimestamp())
                ).await()
            }
        }
    }

    // ---- WhatsApp ----

    suspend fun getWhatsAppPresets(): WhatsAppPresets = withContext(ioDispatcher) {
        runCatching {
            val snap = firestore.collection("settings").document("whatsapp").get().await()
            WhatsAppPresets(
                intakeTemplate = snap.getString("intakeTemplate")?.ifBlank { null } ?: DEFAULT_INTAKE_TEMPLATE,
                deliveryTemplate = snap.getString("deliveryTemplate")?.ifBlank { null } ?: DEFAULT_DELIVERY_TEMPLATE
            )
        }.getOrDefault(WhatsAppPresets())
    }

    suspend fun saveWhatsAppPresets(presets: WhatsAppPresets): Result<Unit> = withContext(ioDispatcher) {
        runCatching {
            firestore.collection("settings").document("whatsapp").set(
                mapOf(
                    "intakeTemplate" to presets.intakeTemplate,
                    "deliveryTemplate" to presets.deliveryTemplate,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Unit
        }
    }

    private companion object {
        const val USERS = "users"
        const val KEY_CUSTOM_TAGS = "workshop_custom_tags"
        val RoleTags = setOf("admin", "tech", "technician", "assistant")
    }
}
