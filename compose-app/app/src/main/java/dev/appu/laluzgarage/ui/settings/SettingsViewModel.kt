package dev.appu.laluzgarage.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.appu.laluzgarage.data.model.UserRole
import dev.appu.laluzgarage.data.model.WorkshopUser
import dev.appu.laluzgarage.data.repository.SettingsRepository
import dev.appu.laluzgarage.data.repository.WhatsAppPresets
import dev.appu.laluzgarage.data.update.AppUpdater
import dev.appu.laluzgarage.data.update.ReleaseChannel
import dev.appu.laluzgarage.data.update.ReleaseInfo
import dev.appu.laluzgarage.ui.services.DEFAULT_DELIVERY_TEMPLATE
import dev.appu.laluzgarage.ui.services.DEFAULT_INTAKE_TEMPLATE
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.File
import javax.inject.Inject

/** Tags that mirror a role; they are managed through the role picker, never as skill tags. */
private val RoleTags = setOf("admin", "owner", "manager", "tech", "technician", "mechanic", "assistant", "helper", "trainee")

data class TagUsage(val name: String, val count: Int)

/** Edit member form. [original] is the saved member the form started from. */
data class MemberForm(
    val original: WorkshopUser,
    val role: UserRole?,
    val name: String,
    val email: String,
    val pin: String,
    val tags: Set<String>
) {
    val isDirty: Boolean
        get() = role != original.effectiveRole ||
            name != original.name ||
            email != original.email ||
            pin != original.pin.orEmpty() ||
            tags != original.skillTags().toSet()
}

fun WorkshopUser.skillTags(): List<String> = tags.map { it.trim().lowercase() }.filter { it.isNotEmpty() && it !in RoleTags }

enum class WhatsAppKind { INTAKE, DELIVERY }

sealed interface UpdateState {
    data object Idle : UpdateState
    data object Checking : UpdateState
    data class Available(val release: ReleaseInfo) : UpdateState
    data class Downloading(val release: ReleaseInfo, val read: Long, val total: Long) : UpdateState
    data class UpToDate(val currentVersion: String) : UpdateState
    data class Failed(val message: String, val release: ReleaseInfo? = null) : UpdateState
}

data class SettingsUiState(
    val users: List<WorkshopUser> = emptyList(),
    val tags: List<TagUsage> = emptyList(),
    val member: MemberForm? = null,
    val isSavingMember: Boolean = false,
    val presets: WhatsAppPresets = WhatsAppPresets(),
    val whatsAppDraft: WhatsAppPresets = WhatsAppPresets(),
    val isSavingWhatsApp: Boolean = false,
    val update: UpdateState = UpdateState.Idle,
    val installPermissionNeeded: Boolean = false,
    val channel: ReleaseChannel = ReleaseChannel.STABLE,
    val autoCheck: Boolean = true,
    /** One-off result of a save or delete, shown as a snackbar. */
    val message: String? = null
) {
    val awaitingRole: Int get() = users.count { it.effectiveRole == null }
    val updateAvailable: Boolean get() = update is UpdateState.Available || update is UpdateState.Downloading
}

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val repository: SettingsRepository,
    private val updater: AppUpdater
) : ViewModel() {

    private val _state = MutableStateFlow(
        SettingsUiState(channel = updater.channel, autoCheck = updater.autoCheck)
    )
    val state: StateFlow<SettingsUiState> = _state.asStateFlow()

    val installedVersion: String get() = updater.installedVersion

    private var usersJob: Job? = null
    private var downloaded: File? = null
    private var downloadJob: Job? = null

    /** Starts the team listener and loads the WhatsApp templates; called when Settings opens. */
    fun onOpen() {
        if (usersJob?.isActive != true) {
            usersJob = viewModelScope.launch {
                combine(repository.usersStream(), repository.customTags) { users, custom -> users to custom }
                    .catch { e -> _state.update { it.copy(message = "Couldn't load the team. ${e.message.orEmpty()}") } }
                    .collect { (users, custom) ->
                        _state.update { it.copy(users = users, tags = tagUsage(users, custom)) }
                    }
            }
        }
        viewModelScope.launch {
            val presets = repository.getWhatsAppPresets()
            _state.update { it.copy(presets = presets, whatsAppDraft = presets) }
        }
    }

    /** Silent launch check behind "Check for updates on launch"; Settings shows the result. */
    fun checkOnLaunch() {
        if (updater.autoCheck && _state.value.update == UpdateState.Idle) checkForUpdates()
    }

    fun clearMessage() = _state.update { it.copy(message = null) }

    private fun tagUsage(users: List<WorkshopUser>, custom: List<String>): List<TagUsage> {
        val names = LinkedHashSet<String>()
        custom.map { it.trim().lowercase() }.filter { it.isNotEmpty() && it !in RoleTags }.forEach { names += it }
        users.forEach { u -> names += u.skillTags() }
        return names.map { name -> TagUsage(name, users.count { name in it.skillTags() }) }
    }

    // ---- Team ----

    fun editMember(user: WorkshopUser) {
        _state.update {
            it.copy(
                member = MemberForm(
                    original = user,
                    role = user.effectiveRole,
                    name = user.name,
                    email = user.email,
                    pin = user.pin.orEmpty(),
                    tags = user.skillTags().toSet()
                )
            )
        }
    }

    fun closeMember() = _state.update { it.copy(member = null) }

    private inline fun editForm(block: (MemberForm) -> MemberForm) =
        _state.update { s -> s.member?.let { s.copy(member = block(it)) } ?: s }

    fun setMemberRole(role: UserRole) = editForm { it.copy(role = role) }
    fun setMemberName(name: String) = editForm { it.copy(name = name) }
    fun setMemberEmail(email: String) = editForm { it.copy(email = email) }
    fun setMemberPin(pin: String) = editForm { it.copy(pin = pin.filter(Char::isDigit).take(4)) }
    fun toggleMemberTag(tag: String) = editForm { f -> f.copy(tags = if (tag in f.tags) f.tags - tag else f.tags + tag) }

    fun saveMember(onSaved: () -> Unit) {
        val form = _state.value.member ?: return
        when {
            form.email.isBlank() -> return _state.update { it.copy(message = "Email address is required.") }
            form.pin.isNotEmpty() && form.pin.length != 4 -> return _state.update { it.copy(message = "Security PIN must be exactly 4 digits.") }
        }
        viewModelScope.launch {
            _state.update { it.copy(isSavingMember = true) }
            repository.saveUser(form.original.id, form.name, form.email, form.role, form.pin, form.tags.sorted())
                .onSuccess {
                    _state.update { it.copy(isSavingMember = false, member = null, message = "Member saved") }
                    onSaved()
                }
                .onFailure { e ->
                    _state.update { it.copy(isSavingMember = false, message = "Couldn't save the member. ${e.message.orEmpty()}") }
                }
        }
    }

    fun deleteMember(onDeleted: () -> Unit) {
        val form = _state.value.member ?: return
        viewModelScope.launch {
            repository.deleteUser(form.original.id)
                .onSuccess {
                    _state.update { it.copy(member = null, message = "Advisor \"${form.original.name}\" deleted") }
                    onDeleted()
                }
                .onFailure { e -> _state.update { it.copy(message = "Couldn't delete the advisor. ${e.message.orEmpty()}") } }
        }
    }

    // ---- Tags ----

    /** Returns false (with a message) when the tag is empty or already exists. */
    fun addTag(raw: String): Boolean {
        val tag = raw.trim().lowercase()
        if (tag.isEmpty()) return false
        if (_state.value.tags.any { it.name == tag } || tag in RoleTags) {
            _state.update { it.copy(message = "Tag \"$tag\" already exists.") }
            return false
        }
        repository.addCustomTag(tag)
        _state.update { it.copy(message = "Tag \"$tag\" created") }
        return true
    }

    fun deleteTag(tag: String) {
        viewModelScope.launch {
            repository.deleteTag(tag, _state.value.users)
                .onSuccess { _state.update { it.copy(message = "Tag \"$tag\" deleted") } }
                .onFailure { e -> _state.update { it.copy(message = "Couldn't remove the tag from every advisor. ${e.message.orEmpty()}") } }
        }
    }

    // ---- WhatsApp ----

    fun setTemplate(kind: WhatsAppKind, text: String) = _state.update {
        it.copy(
            whatsAppDraft = when (kind) {
                WhatsAppKind.INTAKE -> it.whatsAppDraft.copy(intakeTemplate = text)
                WhatsAppKind.DELIVERY -> it.whatsAppDraft.copy(deliveryTemplate = text)
            }
        )
    }

    fun resetTemplate(kind: WhatsAppKind) =
        setTemplate(kind, if (kind == WhatsAppKind.INTAKE) DEFAULT_INTAKE_TEMPLATE else DEFAULT_DELIVERY_TEMPLATE)

    fun discardTemplates() = _state.update { it.copy(whatsAppDraft = it.presets) }

    fun saveTemplates() {
        val draft = _state.value.whatsAppDraft
        viewModelScope.launch {
            _state.update { it.copy(isSavingWhatsApp = true) }
            repository.saveWhatsAppPresets(draft)
                .onSuccess { _state.update { it.copy(isSavingWhatsApp = false, presets = draft, message = "Templates saved") } }
                .onFailure { e -> _state.update { it.copy(isSavingWhatsApp = false, message = "Couldn't save the templates. ${e.message.orEmpty()}") } }
        }
    }

    // ---- App updates ----

    fun setChannel(channel: ReleaseChannel) {
        if (channel == _state.value.channel) return
        updater.channel = channel
        _state.update { it.copy(channel = channel, update = UpdateState.Idle) }
        checkForUpdates()
    }

    fun setAutoCheck(enabled: Boolean) {
        updater.autoCheck = enabled
        _state.update { it.copy(autoCheck = enabled) }
    }

    fun checkForUpdates() {
        val s = _state.value.update
        if (s is UpdateState.Checking || s is UpdateState.Downloading) return
        viewModelScope.launch {
            _state.update { it.copy(update = UpdateState.Checking) }
            runCatching { updater.check(_state.value.channel) }
                .onSuccess { result ->
                    _state.update {
                        it.copy(
                            update = if (result.hasUpdate && result.latest != null) UpdateState.Available(result.latest)
                            else UpdateState.UpToDate(result.currentVersion)
                        )
                    }
                }
                .onFailure {
                    _state.update { it.copy(update = UpdateState.Failed("Could not reach GitHub. Check the internet connection and try again.")) }
                }
        }
    }

    fun downloadAndInstall() {
        val release = when (val s = _state.value.update) {
            is UpdateState.Available -> s.release
            is UpdateState.Failed -> s.release ?: return checkForUpdates()
            else -> return
        }
        val ready = downloaded
        if (ready != null && ready.exists() && ready.name == release.apkName) return install(ready)
        downloadJob = viewModelScope.launch {
            _state.update { it.copy(update = UpdateState.Downloading(release, 0, release.apkSize)) }
            runCatching {
                updater.download(release) { read, total ->
                    _state.update { s ->
                        if (s.update is UpdateState.Downloading) s.copy(update = UpdateState.Downloading(release, read, total)) else s
                    }
                }
            }.onSuccess { file ->
                downloaded = file
                _state.update { it.copy(update = UpdateState.Available(release)) }
                install(file)
            }.onFailure {
                _state.update { it.copy(update = UpdateState.Failed("The download stopped. Check the internet connection and try again.", release)) }
            }
        }
    }

    private fun install(file: File) {
        if (!updater.canInstallPackages()) {
            _state.update { it.copy(installPermissionNeeded = true) }
            return
        }
        _state.update { it.copy(installPermissionNeeded = false) }
        runCatching { updater.install(file) }
            .onFailure { e -> _state.update { it.copy(message = "Couldn't open the installer. ${e.message.orEmpty()}") } }
    }

    fun openInstallPermissionSettings() = updater.openInstallPermissionSettings()

    /** Back from Android settings: install now if the permission was granted. */
    fun onResumeFromPermission() {
        if (_state.value.installPermissionNeeded && updater.canInstallPackages()) {
            downloaded?.takeIf { it.exists() }?.let { install(it) }
        }
    }
}
