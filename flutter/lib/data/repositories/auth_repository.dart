import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/workshop_user.dart';

class AuthRepository {
  final FirebaseAuth _auth;
  final FirebaseFirestore _firestore;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  AuthRepository(this._auth, this._firestore);

  FirebaseAuth get auth => _auth;
  Stream<User?> get authStateChanges => _auth.authStateChanges();
  User? get currentUser => _auth.currentUser;

  CollectionReference get _usersRef => _firestore.collection('users');

  /// Listens to real-time updates of the active user's workshop profile
  Stream<WorkshopUser?> streamUserProfile(String uid) {
    return _usersRef.doc(uid).snapshots().map((snapshot) {
      if (!snapshot.exists) return null;
      return WorkshopUser.fromFirestore(snapshot);
    });
  }

  /// Sign in with Email and Password
  Future<UserCredential> signInWithEmail(String email, String password) async {
    final cred = await _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    if (cred.user != null) {
      await syncUserProfile(cred.user!);
    }
    return cred;
  }

  /// Sign up with Email and Password
  Future<UserCredential> signUpWithEmail(
    String email,
    String password,
    String displayName,
  ) async {
    final cred = await _auth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    if (cred.user != null) {
      await cred.user!.updateDisplayName(displayName.trim());
      await syncUserProfile(cred.user!);
    }
    return cred;
  }

  /// Sign in with Google (Cross-platform)
  Future<UserCredential?> signInWithGoogle() async {
    try {
      if (kIsWeb) {
        final GoogleAuthProvider googleProvider = GoogleAuthProvider();
        final cred = await _auth.signInWithPopup(googleProvider);
        if (cred.user != null) {
          await syncUserProfile(cred.user!);
        }
        return cred;
      }

      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) return null;

      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;
      final OAuthCredential credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      final cred = await _auth.signInWithCredential(credential);
      if (cred.user != null) {
        await syncUserProfile(cred.user!);
      }
      return cred;
    } catch (e) {
      debugPrint('Google Sign-In error: $e');
      rethrow;
    }
  }

  /// Synchronizes the user document in Firestore and handles zero-admin bootstrap
  Future<WorkshopUser?> syncUserProfile(User authUser) async {
    final userRef = _usersRef.doc(authUser.uid);
    final userSnap = await userRef.get();
    final emailLower = authUser.email?.toLowerCase().trim() ?? '';

    if (!userSnap.exists && emailLower.isNotEmpty) {
      // Check if there is a pre-registered profile doc with this email (e.g. added by workshop manager)
      final preQuery =
          await _usersRef.where('email', isEqualTo: emailLower).limit(1).get();

      if (preQuery.docs.isNotEmpty) {
        final oldDoc = preQuery.docs.first;
        final oldData = oldDoc.data() as Map<String, dynamic>;

        final migratedData = {
          ...oldData,
          'name': oldData['name'] ??
              authUser.displayName ??
              emailLower.split('@').first,
          'email': emailLower,
          'photoURL': authUser.photoURL ?? oldData['photoURL'],
          'status': 'online',
          'createdAt': oldData['createdAt'] ?? FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        };

        await userRef.set(migratedData);

        if (oldDoc.id != authUser.uid) {
          await _usersRef.doc(oldDoc.id).delete().catchError((e) {
            debugPrint('Could not delete old pre-registered user doc: $e');
          });
        }
      } else {
        // Brand new profile
        await userRef.set({
          'name': authUser.displayName ??
              (emailLower.isNotEmpty
                  ? emailLower.split('@').first
                  : 'Team Member'),
          'email': emailLower,
          'photoURL': authUser.photoURL,
          'status': 'online',
          'tags': <String>[],
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }
    }

    final freshSnap = await userRef.get();
    if (!freshSnap.exists) return null;

    var profile = WorkshopUser.fromFirestore(freshSnap);

    // Zero-Admin Bootstrap: If no active role, check if any admin exists in the system
    if (profile.effectiveRole == null) {
      try {
        final adminSnap =
            await _usersRef.where('role', isEqualTo: 'admin').limit(1).get();
        bool hasAdmin = adminSnap.docs.isNotEmpty;

        if (!hasAdmin) {
          final tagAdminSnap = await _usersRef
              .where('tags', arrayContains: 'admin')
              .limit(1)
              .get();
          hasAdmin = tagAdminSnap.docs.isNotEmpty;
        }

        if (!hasAdmin) {
          debugPrint('Zero-Admin Bootstrap: Granting initial admin privileges to ${authUser.uid}');
          await userRef.update({
            'role': 'admin',
            'tags': FieldValue.arrayUnion(['admin']),
            'updatedAt': FieldValue.serverTimestamp(),
          });
          profile = profile.copyWith(
            role: 'admin',
            tags: [...profile.tags, 'admin'],
          );
        }
      } catch (e) {
        debugPrint('Admin bootstrap verification failed: $e');
      }
    } else {
      // Mark active user as online
      await userRef.update({
        'status': 'online',
        'updatedAt': FieldValue.serverTimestamp(),
      }).catchError((e) {
        debugPrint('Failed to set user online status: $e');
      });
    }

    return profile;
  }

  /// Sign out: Sets status to offline and terminates Firebase session
  Future<void> signOut() async {
    final user = _auth.currentUser;
    if (user != null) {
      try {
        await _usersRef.doc(user.uid).update({
          'status': 'offline',
          'updatedAt': FieldValue.serverTimestamp(),
        });
      } catch (e) {
        debugPrint('Notice: unable to set offline status on signOut: $e');
      }
    }

    try {
      await _googleSignIn.signOut();
    } catch (_) {}

    await _auth.signOut();
  }
}
