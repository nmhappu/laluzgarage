package dev.appu.laluzgarage.data.model

import com.google.firebase.Timestamp

enum class UserRole(val value: String) {
    ADMIN("admin"),
    TECHNICIAN("technician"),
    ASSISTANT("assistant");

    companion object {
        fun fromString(role: String?): UserRole? {
            return entries.find { it.value.equals(role, ignoreCase = true) }
        }
    }
}

data class WorkshopUser(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val photoURL: String? = null,
    val status: String = "offline",
    val role: String? = null,
    val pin: String? = null,
    val tags: List<String> = emptyList(),
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
) {
    /**
     * Resolves the effective role of a workshop user, inspecting both
     * the explicit `role` field and legacy `tags` array for backward compatibility.
     * Mirrors getUserRole in src/types.ts and firestore.rules
     */
    fun getResolvedRole(): UserRole? {
        val explicitRole = UserRole.fromString(role)
        if (explicitRole != null) return explicitRole

        return when {
            tags.contains("admin") -> UserRole.ADMIN
            tags.contains("tech") || tags.contains("technician") -> UserRole.TECHNICIAN
            tags.contains("assistant") -> UserRole.ASSISTANT
            else -> null
        }
    }

    val isAdmin: Boolean get() = getResolvedRole() == UserRole.ADMIN
    val isTechnician: Boolean get() = isAdmin || getResolvedRole() == UserRole.TECHNICIAN
    val isAssistant: Boolean get() = getResolvedRole() == UserRole.ASSISTANT
    val hasActiveRole: Boolean get() = getResolvedRole() != null
}
