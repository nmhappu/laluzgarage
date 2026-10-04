import 'package:cloud_firestore/cloud_firestore.dart';

enum UserRole {
  admin,
  technician,
  assistant;

  String get value => name;

  String get displayName {
    switch (this) {
      case UserRole.admin:
        return 'Admin';
      case UserRole.technician:
        return 'Technician';
      case UserRole.assistant:
        return 'Assistant';
    }
  }

  static UserRole? fromString(String? val) {
    if (val == null) return null;
    switch (val.toLowerCase().trim()) {
      case 'admin':
        return UserRole.admin;
      case 'technician':
      case 'tech':
        return UserRole.technician;
      case 'assistant':
        return UserRole.assistant;
      default:
        return null;
    }
  }
}

class WorkshopUser {
  final String id;
  final String name;
  final String email;
  final String? photoURL;
  final String status;
  final String? role;
  final String? pin;
  final List<String> tags;
  final Timestamp createdAt;
  final Timestamp updatedAt;

  WorkshopUser({
    required this.id,
    required this.name,
    required this.email,
    this.photoURL,
    required this.status,
    this.role,
    this.pin,
    this.tags = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  /// Resolves effective role from explicit role field or legacy tags taxonomy
  UserRole? get effectiveRole {
    final explicit = UserRole.fromString(role);
    if (explicit != null) return explicit;

    if (tags.contains('admin')) return UserRole.admin;
    if (tags.contains('tech') || tags.contains('technician')) {
      return UserRole.technician;
    }
    if (tags.contains('assistant')) return UserRole.assistant;

    return null;
  }

  bool get isAdmin => effectiveRole == UserRole.admin;
  bool get isTechnician =>
      effectiveRole == UserRole.technician || effectiveRole == UserRole.admin;
  bool get isAssistant => effectiveRole == UserRole.assistant;

  factory WorkshopUser.fromFirestore(DocumentSnapshot doc) {
    final data = (doc.data() as Map<String, dynamic>?) ?? {};
    final rawTags = (data['tags'] as List?) ?? [];
    return WorkshopUser(
      id: doc.id,
      name: data['name'] ?? '',
      email: data['email'] ?? '',
      photoURL: data['photoURL'],
      status: data['status'] ?? 'offline',
      role: data['role'],
      pin: data['pin']?.toString(),
      tags: rawTags.map((e) => e.toString()).toList(),
      createdAt: data['createdAt'] as Timestamp? ?? Timestamp.now(),
      updatedAt: data['updatedAt'] as Timestamp? ?? Timestamp.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'email': email,
      if (photoURL != null) 'photoURL': photoURL,
      'status': status,
      if (role != null) 'role': role,
      if (pin != null) 'pin': pin,
      'tags': tags,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }

  WorkshopUser copyWith({
    String? id,
    String? name,
    String? email,
    String? photoURL,
    String? status,
    String? role,
    String? pin,
    List<String>? tags,
    Timestamp? createdAt,
    Timestamp? updatedAt,
  }) {
    return WorkshopUser(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      photoURL: photoURL ?? this.photoURL,
      status: status ?? this.status,
      role: role ?? this.role,
      pin: pin ?? this.pin,
      tags: tags ?? this.tags,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
