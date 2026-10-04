import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/theme/workshop_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/part.dart';
import '../../data/repositories/inventory_repository.dart';
import '../../data/repositories/firebase_providers.dart';
import '../shell/navigation_provider.dart';

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({super.key});

  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String? _selectedCategory;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showPartFormModal({Part? existingPart}) {
    final nameCtrl = TextEditingController(text: existingPart?.name ?? '');
    final skuCtrl = TextEditingController(text: existingPart?.sku ?? '');
    final catCtrl =
        TextEditingController(text: existingPart?.category ?? 'General');
    final stockCtrl = TextEditingController(
        text: existingPart != null ? existingPart.stockQuantity.toString() : '10');
    final priceCtrl = TextEditingController(
        text: existingPart != null ? existingPart.price.toStringAsFixed(0) : '');
    final minStockCtrl = TextEditingController(
        text: existingPart != null ? existingPart.minStockLevel.toString() : '3');
    final locCtrl =
        TextEditingController(text: existingPart?.location ?? 'Rack A1');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: WorkshopTheme.darkCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          existingPart != null ? 'Edit Spare Part' : 'Add Spare Part',
          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                style: const TextStyle(color: WorkshopTheme.darkTextPrimary),
                decoration: const InputDecoration(
                  labelText: 'Part Name',
                  hintText: 'e.g. Front Brake Pads',
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: skuCtrl,
                      style: const TextStyle(color: WorkshopTheme.darkTextPrimary),
                      decoration: const InputDecoration(
                        labelText: 'SKU / Code',
                        hintText: 'e.g. BRK-01',
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: catCtrl,
                      style: const TextStyle(color: WorkshopTheme.darkTextPrimary),
                      decoration: const InputDecoration(
                        labelText: 'Category',
                        hintText: 'e.g. Brakes',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: stockCtrl,
                      keyboardType: TextInputType.number,
                      style: WorkshopTheme.numeric(
                          color: WorkshopTheme.darkTextPrimary),
                      decoration: const InputDecoration(
                        labelText: 'Stock Quantity',
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: minStockCtrl,
                      keyboardType: TextInputType.number,
                      style: WorkshopTheme.numeric(
                          color: WorkshopTheme.darkTextPrimary),
                      decoration: const InputDecoration(
                        labelText: 'Min Alert Level',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: priceCtrl,
                      keyboardType: TextInputType.number,
                      style: WorkshopTheme.numeric(
                          color: WorkshopTheme.darkTextPrimary),
                      decoration: const InputDecoration(
                        labelText: 'Unit Price (₹)',
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: locCtrl,
                      style: const TextStyle(color: WorkshopTheme.darkTextPrimary),
                      decoration: const InputDecoration(
                        labelText: 'Shelf Location',
                        hintText: 'Rack A1',
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
          ),
          FilledButton(
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty) return;

              final repo = ref.read(inventoryRepositoryProvider);
              if (existingPart != null) {
                final updated = existingPart.copyWith(
                  name: nameCtrl.text.trim(),
                  sku: skuCtrl.text.trim(),
                  category: catCtrl.text.trim(),
                  stockQuantity: int.tryParse(stockCtrl.text) ?? 0,
                  price: double.tryParse(priceCtrl.text) ?? 0.0,
                  minStockLevel: int.tryParse(minStockCtrl.text) ?? 3,
                  location: locCtrl.text.trim(),
                );
                await repo.updatePart(updated);
              } else {
                final newPart = Part(
                  id: '',
                  name: nameCtrl.text.trim(),
                  sku: skuCtrl.text.trim(),
                  category: catCtrl.text.trim(),
                  stockQuantity: int.tryParse(stockCtrl.text) ?? 0,
                  price: double.tryParse(priceCtrl.text) ?? 0.0,
                  minStockLevel: int.tryParse(minStockCtrl.text) ?? 3,
                  location: locCtrl.text.trim(),
                  createdAt: Timestamp.now(),
                  updatedAt: Timestamp.now(),
                );
                await repo.addPart(newPart);
              }

              if (ctx.mounted) Navigator.of(ctx).pop();
            },
            style: FilledButton.styleFrom(
              backgroundColor: WorkshopTheme.emeraldAccent,
              foregroundColor: Colors.black,
            ),
            child: Text(existingPart != null ? 'Update Part' : 'Save Part'),
          ),
        ],
      ),
    );
  }

  void _showDeletePartDialog(Part part) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: WorkshopTheme.darkCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(LucideIcons.trash2, color: WorkshopTheme.statusUrgent, size: 20),
            SizedBox(width: 10),
            Text('Delete Part',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          ],
        ),
        content: Text(
          'Are you sure you want to remove "${part.name}" from inventory?',
          style:
              const TextStyle(color: WorkshopTheme.darkTextMuted, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await ref.read(inventoryRepositoryProvider).deletePart(part.id);
            },
            style: FilledButton.styleFrom(
              backgroundColor: WorkshopTheme.statusUrgent,
              foregroundColor: Colors.white,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final partsAsync = ref.watch(partsStreamProvider);
    final isAdmin = ref.watch(isAdminProvider);

    final isWide = MediaQuery.sizeOf(context).width >= 768;

    return Scaffold(
      backgroundColor: WorkshopTheme.darkCanvas,
      appBar: isWide
          ? AppBar(
              title: const Text(
                'Spares & Parts Inventory',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
              ),
              actions: [
                IconButton(
                  icon: const Icon(LucideIcons.plus, color: WorkshopTheme.emeraldAccent),
                  tooltip: 'Add Spare Part',
                  onPressed: () => _showPartFormModal(),
                ),
              ],
            )
          : null,
      floatingActionButton: isWide
          ? null
          : Padding(
              padding: const EdgeInsets.only(bottom: 60),
              child: FloatingActionButton.small(
                backgroundColor: WorkshopTheme.emeraldAccent,
                foregroundColor: Colors.black,
                tooltip: 'Add Spare Part',
                onPressed: () => _showPartFormModal(),
                child: const Icon(LucideIcons.plus, size: 20),
              ),
            ),
      body: Column(
        children: [
          // Search Input
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _searchController,
              onChanged: (v) =>
                  setState(() => _searchQuery = v.trim().toLowerCase()),
              decoration: InputDecoration(
                hintText: 'Search spare parts by name, SKU or category...',
                prefixIcon: const Icon(LucideIcons.search, size: 18),
                filled: true,
                fillColor: WorkshopTheme.darkCard,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: WorkshopTheme.darkBorder),
                ),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(LucideIcons.x, size: 16),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
              ),
            ),
          ),

          // Categories Horizontal Filter Tabs
          partsAsync.when(
            loading: () => const SizedBox(height: 42),
            error: (_, _) => const SizedBox(height: 42),
            data: (parts) {
              final categories = parts
                  .map((p) => p.category.trim())
                  .where((c) => c.isNotEmpty)
                  .toSet()
                  .toList();
              categories.sort();

              final lowStockCount =
                  parts.where((p) => p.isLowStock).length;

              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Row(
                  children: [
                    FilterChip(
                      label: Text('ALL (${parts.length})'),
                      selected: _selectedCategory == null,
                      selectedColor:
                          WorkshopTheme.emeraldAccent.withValues(alpha: 0.2),
                      labelStyle: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: _selectedCategory == null
                            ? WorkshopTheme.emeraldAccent
                            : WorkshopTheme.darkTextMuted,
                      ),
                      onSelected: (_) =>
                          setState(() => _selectedCategory = null),
                    ),
                    if (lowStockCount > 0) ...[
                      const SizedBox(width: 8),
                      FilterChip(
                        label: Text('LOW STOCK ($lowStockCount)'),
                        selected: _selectedCategory == '__low_stock__',
                        selectedColor:
                            WorkshopTheme.statusUrgent.withValues(alpha: 0.2),
                        labelStyle: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: _selectedCategory == '__low_stock__'
                              ? WorkshopTheme.statusUrgent
                              : WorkshopTheme.statusUrgent,
                        ),
                        onSelected: (_) => setState(() =>
                            _selectedCategory =
                                _selectedCategory == '__low_stock__'
                                    ? null
                                    : '__low_stock__'),
                      ),
                    ],
                    ...categories.map((cat) {
                      final count =
                          parts.where((p) => p.category.trim() == cat).length;
                      final isSelected = _selectedCategory == cat;
                      return Padding(
                        padding: const EdgeInsets.only(left: 8),
                        child: FilterChip(
                          label: Text('$cat ($count)'),
                          selected: isSelected,
                          selectedColor: WorkshopTheme.emeraldAccent
                              .withValues(alpha: 0.2),
                          labelStyle: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: isSelected
                                ? WorkshopTheme.emeraldAccent
                                : WorkshopTheme.darkTextMuted,
                          ),
                          onSelected: (_) => setState(() =>
                              _selectedCategory = isSelected ? null : cat),
                        ),
                      );
                    }),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 6),

          // Parts List View
          Expanded(
            child: partsAsync.when(
              loading: () => const Center(
                child: CircularProgressIndicator(
                    color: WorkshopTheme.emeraldAccent),
              ),
              error: (err, _) => Center(
                child: Text('Error loading inventory: $err',
                    style: const TextStyle(color: Colors.red)),
              ),
              data: (parts) {
                final topBarQuery =
                    ref.watch(topBarSearchQueryProvider).trim().toLowerCase();
                final effectiveQuery =
                    topBarQuery.isNotEmpty ? topBarQuery : _searchQuery;

                final displayParts = parts.where((p) {
                  // Category filter
                  if (_selectedCategory == '__low_stock__') {
                    if (!p.isLowStock) return false;
                  } else if (_selectedCategory != null &&
                      p.category.trim() != _selectedCategory) {
                    return false;
                  }

                  // Search query
                  if (effectiveQuery.isNotEmpty) {
                    final name = p.name.toLowerCase();
                    final cat = p.category.toLowerCase();
                    final sku = (p.sku ?? '').toLowerCase();
                    return name.contains(effectiveQuery) ||
                        cat.contains(effectiveQuery) ||
                        sku.contains(effectiveQuery);
                  }

                  return true;
                }).toList();

                if (displayParts.isEmpty) {
                  return const Center(
                    child: Text(
                      'No matching spare parts found.',
                      style: TextStyle(color: WorkshopTheme.darkTextMuted),
                    ),
                  );
                }

                return ListView.builder(
                  padding: EdgeInsets.fromLTRB(16, 6, 16, isWide ? 16 : 84),
                  itemCount: displayParts.length,
                  itemBuilder: (ctx, idx) {
                    final part = displayParts[idx];
                    final isLow = part.isLowStock;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0A0C10),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isLow
                              ? WorkshopTheme.statusUrgent
                                  .withValues(alpha: 0.4)
                              : WorkshopTheme.darkBorder,
                        ),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: isLow
                                      ? WorkshopTheme.statusUrgent
                                          .withValues(alpha: 0.12)
                                      : WorkshopTheme.darkSurface,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  LucideIcons.package,
                                  color: isLow
                                      ? WorkshopTheme.statusUrgent
                                      : WorkshopTheme.emeraldAccent,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),

                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          part.name,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                            fontSize: 15,
                                            color: WorkshopTheme.darkTextPrimary,
                                          ),
                                        ),
                                        if (part.sku != null &&
                                            part.sku!.isNotEmpty) ...[
                                          const SizedBox(width: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: WorkshopTheme.blueAccent
                                                  .withValues(alpha: 0.15),
                                              borderRadius:
                                                  BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              part.sku!,
                                              style: WorkshopTheme.mono(
                                                fontSize: 10,
                                                fontWeight: FontWeight.w700,
                                                color: WorkshopTheme.blueAccent,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      '${part.category} • Location: ${part.location}',
                                      style: const TextStyle(
                                        color: WorkshopTheme.darkTextMuted,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              // Price
                              Text(
                                Formatters.currency(part.price),
                                style: WorkshopTheme.numeric(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                  color: WorkshopTheme.darkTextPrimary,
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 10),
                          const Divider(
                              height: 1, color: WorkshopTheme.darkBorderSubtle),
                          const SizedBox(height: 8),

                          // Bottom Row: Stock Quantity with +/- Quick Toggles & Edit
                          Row(
                            mainAxisAlignment:
                                MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: isLow
                                          ? WorkshopTheme.statusUrgent
                                              .withValues(alpha: 0.15)
                                          : WorkshopTheme.emeraldAccent
                                              .withValues(alpha: 0.15),
                                      borderRadius:
                                          BorderRadius.circular(6),
                                      border: Border.all(
                                        color: isLow
                                            ? WorkshopTheme.statusUrgent
                                                .withValues(alpha: 0.4)
                                            : WorkshopTheme.emeraldAccent
                                                .withValues(alpha: 0.4),
                                      ),
                                    ),
                                    child: Text(
                                      isLow
                                          ? 'LOW STOCK: ${part.stockQuantity}'
                                          : 'IN STOCK: ${part.stockQuantity}',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 0.5,
                                        color: isLow
                                            ? WorkshopTheme.statusUrgent
                                            : WorkshopTheme.emeraldAccent,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),

                                  // Minus Button
                                  IconButton(
                                    icon: const Icon(LucideIcons.minus,
                                        size: 14),
                                    style: IconButton.styleFrom(
                                      backgroundColor:
                                          WorkshopTheme.darkSurface,
                                      padding: const EdgeInsets.all(6),
                                      minimumSize: const Size(28, 28),
                                    ),
                                    onPressed: () {
                                      if (part.stockQuantity > 0) {
                                        ref
                                            .read(
                                                inventoryRepositoryProvider)
                                            .updateStock(part.id,
                                                part.stockQuantity - 1);
                                      }
                                    },
                                  ),
                                  const SizedBox(width: 4),

                                  // Plus Button
                                  IconButton(
                                    icon: const Icon(LucideIcons.plus,
                                        size: 14),
                                    style: IconButton.styleFrom(
                                      backgroundColor:
                                          WorkshopTheme.darkSurface,
                                      padding: const EdgeInsets.all(6),
                                      minimumSize: const Size(28, 28),
                                    ),
                                    onPressed: () {
                                      ref
                                          .read(inventoryRepositoryProvider)
                                          .updateStock(part.id,
                                              part.stockQuantity + 1);
                                    },
                                  ),
                                ],
                              ),

                              // Edit & Delete Actions
                              Row(
                                children: [
                                  IconButton(
                                    icon: const Icon(LucideIcons.edit2,
                                        size: 16,
                                        color: WorkshopTheme.darkTextMuted),
                                    tooltip: 'Edit Part',
                                    onPressed: () => _showPartFormModal(
                                        existingPart: part),
                                  ),
                                  if (isAdmin)
                                    IconButton(
                                      icon: const Icon(LucideIcons.trash2,
                                          size: 16,
                                          color: WorkshopTheme.statusUrgent),
                                      tooltip: 'Delete Part',
                                      onPressed: () =>
                                          _showDeletePartDialog(part),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
