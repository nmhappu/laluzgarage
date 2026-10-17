# Proguard rules for LaluZ Garage Jetpack Compose
-keepattributes *Annotation*
-dontwarn javax.annotation.**

# Firestore maps documents to these classes via reflection
-keep class dev.appu.laluzgarage.data.model.** { *; }

# Credential Manager loads its Play Services provider reflectively
-if class androidx.credentials.CredentialManager
-keep class androidx.credentials.playservices.** {
  *;
}
