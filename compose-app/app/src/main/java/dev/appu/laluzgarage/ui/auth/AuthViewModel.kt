package dev.appu.laluzgarage.ui.auth

import android.content.Context
import android.util.Log
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.FirebaseAuthInvalidUserException
import com.google.firebase.auth.FirebaseUser
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import dev.appu.laluzgarage.R
import dev.appu.laluzgarage.data.model.WorkshopUser
import dev.appu.laluzgarage.data.repository.AuthRepository
import dev.appu.laluzgarage.data.repository.ThemePreferences
import dev.appu.laluzgarage.ui.theme.ThemeMode
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class AuthScreenState {
    LOADING,
    UNAUTHENTICATED,
    PENDING_APPROVAL,
    /** Approved, signed in for the first time on this device: pick a theme before the dashboard. */
    CHOOSE_THEME,
    AUTHENTICATED
}

enum class AuthMethod {
    IDLE,
    EMAIL
}

data class AuthUiState(
    val screenState: AuthScreenState = AuthScreenState.LOADING,
    val authMethod: AuthMethod = AuthMethod.IDLE,
    val email: String = "",
    val password: String = "",
    val isPasswordVisible: Boolean = false,
    val isAuthenticating: Boolean = false,
    val isGoogleAuthenticating: Boolean = false,
    val isCheckingApproval: Boolean = false,
    val errorMessage: String? = null,
    val emailError: String? = null,
    val passwordError: String? = null,
    val user: FirebaseUser? = null,
    val profile: WorkshopUser? = null,
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    /** Material You: take the colour scheme from the device wallpaper (Android 12+). */
    val dynamicColor: Boolean = false
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val themePreferences: ThemePreferences,
    @ApplicationContext private val appContext: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        AuthUiState(themeMode = themePreferences.themeMode.value, dynamicColor = themePreferences.dynamicColor.value)
    )
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                authRepository.currentUser,
                authRepository.userProfile,
                authRepository.isAuthLoading,
                themePreferences.themeChosenBy
            ) { user, profile, isLoading, themeChosenBy ->
                val nextScreenState = when {
                    isLoading -> AuthScreenState.LOADING
                    user == null -> AuthScreenState.UNAUTHENTICATED
                    profile?.effectiveRole == null -> AuthScreenState.PENDING_APPROVAL
                    user.uid !in themeChosenBy -> AuthScreenState.CHOOSE_THEME
                    else -> AuthScreenState.AUTHENTICATED
                }
                Triple(user, profile, nextScreenState)
            }.collect { (user, profile, nextScreenState) ->

                _uiState.update { current ->
                    current.copy(
                        screenState = nextScreenState,
                        user = user,
                        profile = profile
                    )
                }
            }
        }
        viewModelScope.launch {
            themePreferences.themeMode.collect { mode -> _uiState.update { it.copy(themeMode = mode) } }
        }
        viewModelScope.launch {
            themePreferences.dynamicColor.collect { on -> _uiState.update { it.copy(dynamicColor = on) } }
        }
    }

    fun onEmailChanged(email: String) {
        _uiState.update { it.copy(email = email, errorMessage = null, emailError = null) }
    }

    fun onPasswordChanged(password: String) {
        _uiState.update { it.copy(password = password, errorMessage = null, passwordError = null) }
    }

    fun togglePasswordVisibility() {
        _uiState.update { it.copy(isPasswordVisible = !it.isPasswordVisible) }
    }

    fun setAuthMethod(method: AuthMethod) {
        _uiState.update { it.copy(authMethod = method, errorMessage = null, emailError = null, passwordError = null) }
    }

    fun setThemeMode(mode: ThemeMode) {
        themePreferences.setThemeMode(mode)
    }

    fun setDynamicColor(enabled: Boolean) {
        themePreferences.setDynamicColor(enabled)
    }

    /** First sign-in theme picker: the mode and colour are already live, so this only moves on. */
    fun finishThemeChoice() {
        _uiState.value.user?.uid?.let(themePreferences::markThemeChosen)
    }

    /** Login screen toggle: flips whatever is showing now to the other theme. */
    fun toggleTheme(currentlyDark: Boolean) {
        themePreferences.setThemeMode(if (currentlyDark) ThemeMode.LIGHT else ThemeMode.DARK)
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    fun signInWithEmail() {
        val state = _uiState.value
        val emailError = if (state.email.isBlank()) "Enter your email address." else null
        val passwordError = if (state.password.isBlank()) "Enter your password." else null
        if (emailError != null || passwordError != null) {
            _uiState.update { it.copy(emailError = emailError, passwordError = passwordError) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isAuthenticating = true, errorMessage = null) }
            val result = authRepository.signInWithEmail(state.email, state.password)
            result.onFailure { error ->
                val message = when (error) {
                    is FirebaseAuthInvalidUserException,
                    is FirebaseAuthInvalidCredentialsException -> "That email and password don't match. Check them and try again."
                    else -> error.localizedMessage ?: "Couldn't sign in. Check your connection and try again."
                }
                _uiState.update { it.copy(isAuthenticating = false, errorMessage = message) }
            }.onSuccess {
                _uiState.update { it.copy(isAuthenticating = false, errorMessage = null) }
            }
        }
    }

    /** Google sign-in through Credential Manager. [activityContext] must be an Activity. */
    fun signInWithGoogle(activityContext: Context) {
        if (_uiState.value.isGoogleAuthenticating) return
        viewModelScope.launch {
            _uiState.update { it.copy(isGoogleAuthenticating = true, errorMessage = null) }
            val message: String? = try {
                val option = GetSignInWithGoogleOption.Builder(
                    activityContext.getString(R.string.default_web_client_id)
                ).build()
                val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
                val credential = CredentialManager.create(activityContext)
                    .getCredential(activityContext, request)
                    .credential
                if (credential is CustomCredential &&
                    credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                ) {
                    val idToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
                    authRepository.signInWithGoogle(idToken).exceptionOrNull()?.let {
                        it.localizedMessage ?: "Couldn't sign in with Google. Try again."
                    }
                } else {
                    "Couldn't sign in with Google. Try again."
                }
            } catch (_: GetCredentialCancellationException) {
                null
            } catch (_: NoCredentialException) {
                "No Google account on this device. Add one in Settings, then try again."
            } catch (e: GoogleIdTokenParsingException) {
                Log.e(TAG, "Google ID token parsing failed", e)
                "Couldn't sign in with Google. Try again."
            } catch (e: GetCredentialException) {
                Log.e(TAG, "Credential Manager error", e)
                e.errorMessage?.toString() ?: "Couldn't sign in with Google. Try again."
            }
            _uiState.update { it.copy(isGoogleAuthenticating = false, errorMessage = message) }
        }
    }

    fun refreshApprovalStatus() {
        viewModelScope.launch {
            _uiState.update { it.copy(isCheckingApproval = true) }
            authRepository.refreshProfile()
            _uiState.update { it.copy(isCheckingApproval = false) }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            authRepository.signOut()
            runCatching { CredentialManager.create(appContext).clearCredentialState(ClearCredentialStateRequest()) }
            _uiState.update { it.copy(authMethod = AuthMethod.IDLE, email = "", password = "") }
        }
    }

    private companion object {
        const val TAG = "AuthViewModel"
    }
}
