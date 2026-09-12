import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static const String firestoreDatabaseId =
      'ai-studio-68b1ba2c-7611-4e4f-b6eb-ac12f212fa4e';

  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      default:
        return android;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyDOKnWPCvAAujHhxz6r2HOcvpi_cFsvnIQ',
    appId: '1:70866316727:web:8da6fe030884ed85b08c32',
    messagingSenderId: '70866316727',
    projectId: 'gen-lang-client-0601889915',
    authDomain: 'gen-lang-client-0601889915.firebaseapp.com',
    storageBucket: 'gen-lang-client-0601889915.firebasestorage.app',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDOKnWPCvAAujHhxz6r2HOcvpi_cFsvnIQ',
    appId: '1:70866316727:android:5b368e6197604f48b08c32',
    messagingSenderId: '70866316727',
    projectId: 'gen-lang-client-0601889915',
    storageBucket: 'gen-lang-client-0601889915.firebasestorage.app',
  );
}
