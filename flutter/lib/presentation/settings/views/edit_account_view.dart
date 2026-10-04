import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/workshop_theme.dart';
import '../../../data/models/workshop_user.dart';

class EditAccountView extends StatefulWidget {
  final bool isCreating;
  final WorkshopUser? user;
  final bool isCurrentUser;
  final List<String> availableTags;
  final Future<bool> Function({
    required String name,
    required String email,
    required UserRole role,
    required String? pin,
    required List<String> tags,
  }) onSave;
  final VoidCallback onDelete;
  final VoidCallback onCancel;

  const EditAccountView({
    super.key,
    required this.isCreating,
    this.user,
    required this.isCurrentUser,
    required this.availableTags,
    required this.onSave,
    required this.onDelete,
    required this.onCancel,
  });

  @override
  State<EditAccountView> createState() => _EditAccountViewState();
}

class _EditAccountViewState extends State<EditAccountView> {
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _pinController;
  late UserRole _selectedRole;
  late List<String> _selectedTags;
  bool _showPin = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.user?.name ?? '');
    _emailController = TextEditingController(text: widget.user?.email ?? '');
    _pinController = TextEditingController(text: widget.user?.pin ?? '');
    _selectedRole = widget.user?.effectiveRole ?? UserRole.technician;
    _selectedTags = List.from(widget.user?.tags ?? []);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  void _toggleTag(String tag) {
    setState(() {
      if (_selectedTags.contains(tag)) {
        _selectedTags.remove(tag);
      } else {
        _selectedTags.add(tag);
      }
    });
  }

  Future<void> _handleSave() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final pin = _pinController.text.trim();

    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Email address is required.')),
      );
      return;
    }

    if (pin.isNotEmpty && pin.length != 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('PIN must be exactly 4 digits.')),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final success = await widget.onSave(
        name: name,
        email: email,
        role: _selectedRole,
        pin: pin.isNotEmpty ? pin : null,
        tags: _selectedTags,
      );
      if (mounted && !success) {
        setState(() => _isSaving = false);
      }
    } catch (_) {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final customTags = widget.availableTags
        .where((t) => !['admin', 'tech', 'technician', 'assistant'].contains(t.toLowerCase()))
        .toList();

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      children: [
        Text(
          widget.isCreating ? 'CREATE TEAM ACCOUNT' : 'EDIT TEAM ACCOUNT',
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
            color: WorkshopTheme.darkTextMuted,
          ),
        ),
        const SizedBox(height: 16),

        // Role Selection Grid
        const Text(
          'OPERATIONAL ROLE',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.0,
            color: WorkshopTheme.darkTextMuted,
          ),
        ),
        const SizedBox(height: 8),

        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth > 500;
            return Flex(
              direction: isWide ? Axis.horizontal : Axis.vertical,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildRoleCard(
                  role: UserRole.admin,
                  title: 'ADMIN',
                  icon: LucideIcons.shield,
                  color: WorkshopTheme.statusUrgent,
                  description: 'Full CRUD access, deletion rights & user role management.',
                  isExpanded: isWide,
                ),
                SizedBox(width: isWide ? 8 : 0, height: isWide ? 0 : 8),
                _buildRoleCard(
                  role: UserRole.technician,
                  title: 'TECHNICIAN',
                  icon: LucideIcons.wrench,
                  color: WorkshopTheme.statusSuccess,
                  description: 'Full operations & parts intake. Cannot delete records or parts.',
                  isExpanded: isWide,
                ),
                SizedBox(width: isWide ? 8 : 0, height: isWide ? 0 : 8),
                _buildRoleCard(
                  role: UserRole.assistant,
                  title: 'ASSISTANT',
                  icon: LucideIcons.eye,
                  color: const Color(0xFF38BDF8),
                  description: 'Service Intake Wizard access. Read-only dashboard & records.',
                  isExpanded: isWide,
                ),
              ],
            );
          },
        ),

        const SizedBox(height: 20),

        // Full Name Field
        const Text(
          'FULL NAME',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.0,
            color: WorkshopTheme.darkTextMuted,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _nameController,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: WorkshopTheme.darkTextPrimary,
          ),
          decoration: InputDecoration(
            hintText: 'e.g. John Doe',
            hintStyle: const TextStyle(color: WorkshopTheme.darkTextMuted, fontSize: 13),
            prefixIcon: const Icon(LucideIcons.user, size: 16, color: WorkshopTheme.darkTextMuted),
            filled: true,
            fillColor: WorkshopTheme.darkSurface,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: WorkshopTheme.darkBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: WorkshopTheme.darkBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: WorkshopTheme.emeraldAccent),
            ),
          ),
        ),

        const SizedBox(height: 16),

        // Email Address Field
        const Text(
          'EMAIL ADDRESS',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.0,
            color: WorkshopTheme.darkTextMuted,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: WorkshopTheme.darkTextPrimary,
          ),
          decoration: InputDecoration(
            hintText: 'member@laluzgarage.com',
            hintStyle: const TextStyle(color: WorkshopTheme.darkTextMuted, fontSize: 13),
            prefixIcon: const Icon(LucideIcons.mail, size: 16, color: WorkshopTheme.darkTextMuted),
            filled: true,
            fillColor: WorkshopTheme.darkSurface,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: WorkshopTheme.darkBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: WorkshopTheme.darkBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: WorkshopTheme.emeraldAccent),
            ),
          ),
        ),

        const SizedBox(height: 16),

        // PIN Field
        const Text(
          'INTAKE SECURITY PIN (4 DIGITS)',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.0,
            color: WorkshopTheme.darkTextMuted,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _pinController,
          keyboardType: TextInputType.number,
          maxLength: 4,
          obscureText: !_showPin,
          style: WorkshopTheme.numeric(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: WorkshopTheme.darkTextPrimary,
            letterSpacing: 3.0,
          ),
          decoration: InputDecoration(
            counterText: '',
            hintText: '4-Digit Security PIN',
            hintStyle: const TextStyle(
              color: WorkshopTheme.darkTextMuted,
              fontSize: 13,
              letterSpacing: 0,
            ),
            prefixIcon: const Icon(LucideIcons.key, size: 16, color: WorkshopTheme.darkTextMuted),
            suffixIcon: IconButton(
              icon: Icon(
                _showPin ? LucideIcons.eyeOff : LucideIcons.eye,
                size: 16,
                color: WorkshopTheme.darkTextMuted,
              ),
              onPressed: () => setState(() => _showPin = !_showPin),
            ),
            filled: true,
            fillColor: WorkshopTheme.darkSurface,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: WorkshopTheme.darkBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: WorkshopTheme.darkBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: WorkshopTheme.emeraldAccent),
            ),
          ),
        ),

        // Optional Skill & Department Tags
        if (customTags.isNotEmpty) ...[
          const SizedBox(height: 18),
          const Text(
            'SKILL & DEPARTMENT TAGS',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.0,
              color: WorkshopTheme.darkTextMuted,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: customTags.map((tag) {
              final isSelected = _selectedTags.contains(tag);
              const tagColor = Color(0xFF818CF8);
              return InkWell(
                onTap: () => _toggleTag(tag),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? tagColor.withValues(alpha: 0.15)
                        : WorkshopTheme.darkSurface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isSelected
                          ? tagColor.withValues(alpha: 0.5)
                          : WorkshopTheme.darkBorder,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        LucideIcons.tag,
                        size: 13,
                        color: isSelected ? tagColor : WorkshopTheme.darkTextMuted,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        tag.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                          color: isSelected ? tagColor : WorkshopTheme.darkTextMuted,
                        ),
                      ),
                      if (isSelected) ...[
                        const SizedBox(width: 4),
                        const Icon(LucideIcons.check, size: 12, color: tagColor),
                      ],
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],

        const SizedBox(height: 32),
        const Divider(height: 1, color: WorkshopTheme.darkBorder),
        const SizedBox(height: 16),

        // Bottom Actions Bar
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            if (!widget.isCreating && widget.user != null)
              widget.isCurrentUser
                  ? const Opacity(
                      opacity: 0.5,
                      child: Row(
                        children: [
                          Icon(LucideIcons.trash2, size: 14, color: WorkshopTheme.darkTextMuted),
                          SizedBox(width: 6),
                          Text(
                            'DELETE (SELF)',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.8,
                              color: WorkshopTheme.darkTextMuted,
                            ),
                          ),
                        ],
                      ),
                    )
                  : TextButton.icon(
                      onPressed: widget.onDelete,
                      icon: const Icon(LucideIcons.trash2, size: 14, color: WorkshopTheme.statusUrgent),
                      label: const Text(
                        'DELETE ACCOUNT',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                          color: WorkshopTheme.statusUrgent,
                        ),
                      ),
                    )
            else
              const SizedBox.shrink(),

            Row(
              children: [
                TextButton(
                  onPressed: widget.onCancel,
                  child: const Text(
                    'CANCEL',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                      color: WorkshopTheme.darkTextMuted,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton.icon(
                  onPressed: _isSaving ? null : _handleSave,
                  icon: _isSaving
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.black,
                          ),
                        )
                      : const Icon(LucideIcons.check, size: 16),
                  label: Text(
                    widget.isCreating ? 'CREATE ACCOUNT' : 'SAVE CHANGES',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.8,
                    ),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: WorkshopTheme.emeraldAccent,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRoleCard({
    required UserRole role,
    required String title,
    required IconData icon,
    required Color color,
    required String description,
    required bool isExpanded,
  }) {
    final isSelected = _selectedRole == role;

    final cardContent = InkWell(
      onTap: () => setState(() => _selectedRole = role),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected
              ? color.withValues(alpha: 0.1)
              : WorkshopTheme.darkSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? color.withValues(alpha: 0.6)
                : WorkshopTheme.darkBorder,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(icon, size: 14, color: isSelected ? color : WorkshopTheme.darkTextPrimary),
                    const SizedBox(width: 6),
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.8,
                        color: isSelected ? color : WorkshopTheme.darkTextPrimary,
                      ),
                    ),
                  ],
                ),
                if (isSelected)
                  Icon(LucideIcons.check, size: 14, color: color),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              description,
              style: const TextStyle(
                fontSize: 10.5,
                color: WorkshopTheme.darkTextMuted,
                height: 1.35,
              ),
            ),
          ],
        ),
      ),
    );

    if (isExpanded) {
      return Expanded(child: cardContent);
    }
    return cardContent;
  }
}
