package dev.appu.laluzgarage.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.ServerTimestamp

enum class UserRole(val value: String) {
    ADMIN("admin"),
    TECHNICIAN("technician"),
    ASSISTANT("assistant");

    companion object {
        fun fromString(role: String?): UserRole? {
            if (role == null) return null
            val clean = role.trim().lowercase()
            return when (clean) {
                "admin", "owner", "manager" -> ADMIN
                "technician", "tech", "mechanic" -> TECHNICIAN
                "assistant", "helper", "trainee" -> ASSISTANT
                else -> null
            }
        }
    }
}

data class WorkshopUser(
    @DocumentId
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val photoURL: String? = null,
    val status: String = "offline",
    val role: String? = null,
    val pin: String? = null,
    val tags: List<String> = emptyList(),
    val createdAt: Any? = null,
    val updatedAt: Any? = null
) {
    /**
     * Resolves the effective role of the workshop user, inspecting both
     * the explicit `role` field (with synonyms) and legacy `tags` array for backward compatibility
     * with the React web application and Firestore security rules.
     */
    val effectiveRole: UserRole?
        get() {
            // 1. Explicit formal role (e.g. 'admin', 'technician', 'tech', 'assistant')
            UserRole.fromString(role)?.let { return it }

            // 2. Legacy tags taxonomy fallback (case-insensitive)
            val cleanTags = tags.map { it.trim().lowercase() }
            if (cleanTags.any { it == "admin" || it == "owner" || it == "manager" }) return UserRole.ADMIN
            if (cleanTags.any { it == "technician" || it == "tech" || it == "mechanic" }) return UserRole.TECHNICIAN
            if (cleanTags.any { it == "assistant" || it == "helper" || it == "trainee" }) return UserRole.ASSISTANT

            return null
        }

    val isAdmin: Boolean
        get() = effectiveRole == UserRole.ADMIN

    val isTechnician: Boolean
        get() = effectiveRole == UserRole.TECHNICIAN || effectiveRole == UserRole.ADMIN

    val isAssistant: Boolean
        get() = effectiveRole == UserRole.ASSISTANT

    val hasActiveRole: Boolean
        get() = effectiveRole != null

    companion object {
        fun fromDocument(doc: DocumentSnapshot): WorkshopUser {
            val data = doc.data ?: emptyMap()
            val rawName = (data["name"] as? String)
                ?: (data["displayName"] as? String)
                ?: ""
            val rawEmail = (data["email"] as? String) ?: ""
            val rawRole = (data["role"] as? String)
                ?: (data["userRole"] as? String)
                ?: (data["roleName"] as? String)

            // Pin can be stored as Number (e.g. 1234) or String ("1234") in Firestore
            val rawPin = data["pin"]?.toString()

            val rawTags = data["tags"]
            val parsedTags = when (rawTags) {
                is List<*> -> rawTags.mapNotNull { it?.toString() }
                is String -> listOf(rawTags)
                else -> emptyList()
            }

            return WorkshopUser(
                id = doc.id,
                name = rawName,
                email = rawEmail,
                photoURL = data["photoURL"] as? String,
                status = (data["status"] as? String) ?: "offline",
                role = rawRole,
                pin = rawPin,
                tags = parsedTags,
                createdAt = data["createdAt"],
                updatedAt = data["updatedAt"]
            )
        }
    }
}
