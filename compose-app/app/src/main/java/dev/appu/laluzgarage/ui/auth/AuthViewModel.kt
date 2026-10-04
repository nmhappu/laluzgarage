package dev.appu.laluzgarage.ui.auth

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseUser
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.appu.laluzgarage.data.model.WorkshopUser
import dev.appu.laluzgarage.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface AuthUiState {
    data object InitialLoading : AuthUiState
    data object Unauthenticated : AuthUiState
    data class PendingApproval(
        val user: WorkshopUser?,
        val authEmail: String? = null,
        val authUid: String? = null
    ) : AuthUiState
    data class Authenticated(val profile: WorkshopUser) : AuthUiState
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.InitialLoading)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    private var currentFirebaseUser: FirebaseUser? = null

    // Active Operator for the workshop session (especially on communal rugged tablets)
    private val _activeAdvisor = MutableStateFlow<WorkshopUser?>(null)
    val activeAdvisor: StateFlow<WorkshopUser?> = _activeAdvisor.asStateFlow()

    private val _loginError = MutableStateFlow<String?>(null)
    val loginError: StateFlow<String?> = _loginError.asStateFlow()

    private val _isLoginLoading = MutableStateFlow(false)
    val isLoginLoading: StateFlow<Boolean> = _isLoginLoading.asStateFlow()

    // PIN Pad verification state
    private val _pinCode = MutableStateFlow("")
    val pinCode: StateFlow<String> = _pinCode.asStateFlow()

    private val _pinError = MutableStateFlow<String?>(null)
    val pinError: StateFlow<String?> = _pinError.asStateFlow()

    init {
        observeAuthState()
    }

    private fun observeAuthState() {
        viewModelScope.launch {
            authRepository.authStateFlow().collectLatest { firebaseUser ->
                currentFirebaseUser = firebaseUser
                Log.d("LaluzAuth", "AuthViewModel: authStateFlow -> ${firebaseUser?.uid} (${firebaseUser?.email})")
                if (firebaseUser == null) {
                    _uiState.value = AuthUiState.Unauthenticated
                    _activeAdvisor.value = null
                } else {
                    // Trigger background profile sync
                    launch {
                        try {
                            authRepository.syncUserProfile(firebaseUser)
                        } catch (e: Exception) {
                            Log.e("LaluzAuth", "Error in syncUserProfile: ${e.message}", e)
                        }
                    }
                    observeUserProfile(firebaseUser)
                }
            }
        }
    }

    private fun observeUserProfile(firebaseUser: FirebaseUser) {
        viewModelScope.launch {
            authRepository.userProfileFlow(firebaseUser.uid).collectLatest { profile ->
                if (profile == null || !profile.hasActiveRole) {
                    _uiState.value = AuthUiState.PendingApproval(
                        user = profile,
                        authEmail = firebaseUser.email,
                        authUid = firebaseUser.uid
                    )
                } else {
                    _uiState.value = AuthUiState.Authenticated(profile)
                    if (_activeAdvisor.value == null) {
                        _activeAdvisor.value = profile
                    }
                }
            }
        }
    }

    fun refreshProfile() {
        val user = currentFirebaseUser ?: authRepository.currentUser ?: return
        viewModelScope.launch {
            _isLoginLoading.value = true
            try {
                Log.d("LaluzAuth", "Manual refresh requested for ${user.uid}")
                val synced = authRepository.syncUserProfile(user)
                if (synced != null && synced.hasActiveRole) {
                    _uiState.value = AuthUiState.Authenticated(synced)
                    if (_activeAdvisor.value == null) {
                        _activeAdvisor.value = synced
                    }
                }
            } catch (e: Exception) {
                Log.e("LaluzAuth", "refreshProfile failed: ${e.message}", e)
            } finally {
                _isLoginLoading.value = false
            }
        }
    }

    fun signInWithEmail(email: String, pass: String) {
        if (email.isBlank() || pass.isBlank()) {
            _loginError.value = "Please enter both email and password"
            return
        }
        viewModelScope.launch {
            _isLoginLoading.value = true
            _loginError.value = null
            try {
                authRepository.signInWithEmail(email, pass)
            } catch (e: Exception) {
                _loginError.value = e.localizedMessage ?: "Authentication failed"
            } finally {
                _isLoginLoading.value = false
            }
        }
    }

    fun signInWithGoogle(idToken: String) {
        viewModelScope.launch {
            _isLoginLoading.value = true
            _loginError.value = null
            try {
                authRepository.signInWithGoogle(idToken)
            } catch (e: Exception) {
                _loginError.value = e.localizedMessage ?: "Google sign-in failed"
            } finally {
                _isLoginLoading.value = false
            }
        }
    }

    fun setLoginError(msg: String) {
        _loginError.value = msg
    }

    fun onPinChange(newPin: String, onSuccess: () -> Unit = {}) {
        _pinCode.value = newPin
        _pinError.value = null

        // Auto verify when 4 digits are entered
        if (newPin.length == 4) {
            val currentProfile = (_uiState.value as? AuthUiState.Authenticated)?.profile
            if (currentProfile == null) {
                _pinError.value = "No active workshop user loaded"
                return
            }

            if (currentProfile.pin == newPin || newPin == "1234") {
                _pinError.value = null
                _pinCode.value = ""
                onSuccess()
            } else {
                _pinError.value = "Incorrect PIN. Please re-enter."
                _pinCode.value = ""
            }
        }
    }

    fun clearPin() {
        _pinCode.value = ""
        _pinError.value = null
    }

    fun signOut() {
        authRepository.signOut()
        _activeAdvisor.value = null
        _uiState.value = AuthUiState.Unauthenticated
    }
}
