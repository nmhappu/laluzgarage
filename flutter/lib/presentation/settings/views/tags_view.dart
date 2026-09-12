import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/workshop_theme.dart';
import '../../../data/models/workshop_user.dart';

class TagsView extends StatefulWidget {
  final List<WorkshopUser> users;
  final List<String> availableTags;
  final ValueChanged<String> onCreateTag;
  final ValueChanged<String> onDeleteTag;

  const TagsView({
    super.key,
    required this.users,
    required this.availableTags,
    required this.onCreateTag,
    required this.onDeleteTag,
  });

  @override
  State<TagsView> createState() => _TagsViewState();
}

class _TagsViewState extends State<TagsView> {
  final TextEditingController _tagInputController = TextEditingController();

  @override
  void dispose() {
    _tagInputController.dispose();
    super.dispose();
  }

  void _submitNewTag() {
    final text = _tagInputController.text.trim().toLowerCase();
    if (text.isNotEmpty) {
      widget.onCreateTag(text);
      _tagInputController.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    const indigoColor = Color(0xFF818CF8);

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      children: [
        // Create New Tag section
        const Text(
          'CREATE NEW TAG',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
            color: WorkshopTheme.darkTextMuted,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _tagInputController,
                onSubmitted: (_) => _submitNewTag(),
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: WorkshopTheme.darkTextPrimary,
                ),
                decoration: InputDecoration(
                  hintText: 'New tag name (e.g. mechanic, electrical)',
                  hintStyle: const TextStyle(
                    fontSize: 13,
                    color: WorkshopTheme.darkTextMuted,
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
                    borderSide: const BorderSide(color: indigoColor),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            FilledButton.icon(
              onPressed: _submitNewTag,
              icon: const Icon(LucideIcons.plus, size: 16),
              label: const Text(
                'ADD TAG',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                ),
              ),
              style: FilledButton.styleFrom(
                backgroundColor: indigoColor.withValues(alpha: 0.15),
                foregroundColor: indigoColor,
                side: BorderSide(color: indigoColor.withValues(alpha: 0.35)),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 28),

        // Manage Tags section
        const Text(
          'MANAGE TAGS',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
            color: WorkshopTheme.darkTextMuted,
          ),
        ),
        const SizedBox(height: 12),

        if (widget.availableTags.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 48),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: WorkshopTheme.darkBorder.withValues(alpha: 0.5),
                style: BorderStyle.solid,
              ),
            ),
            child: const Center(
              child: Text(
                'NO TAGS CREATED YET.',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.0,
                  color: WorkshopTheme.darkTextMuted,
                ),
              ),
            ),
          )
        else
          Container(
            decoration: const BoxDecoration(
              border: Border(
                top: BorderSide(color: WorkshopTheme.darkBorder),
                bottom: BorderSide(color: WorkshopTheme.darkBorder),
              ),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: widget.availableTags.length,
              separatorBuilder: (_, _) => const Divider(
                height: 1,
                color: WorkshopTheme.darkBorder,
              ),
              itemBuilder: (context, index) {
                final tag = widget.availableTags[index];
                final count = widget.users.where((u) => u.tags.contains(tag)).length;

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: indigoColor.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: indigoColor.withValues(alpha: 0.35),
                              ),
                            ),
                            child: Text(
                              tag.toUpperCase(),
                              style: WorkshopTheme.mono(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: indigoColor,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '($count ${count == 1 ? 'advisor' : 'advisors'})',
                            style: WorkshopTheme.numeric(
                              fontSize: 12,
                              color: WorkshopTheme.darkTextMuted,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        onPressed: () => widget.onDeleteTag(tag),
                        icon: const Icon(
                          LucideIcons.trash2,
                          size: 17,
                          color: WorkshopTheme.darkTextMuted,
                        ),
                        tooltip: 'Delete tag "$tag"',
                        hoverColor: WorkshopTheme.statusUrgent.withValues(alpha: 0.1),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}
