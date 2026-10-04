import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/workshop_theme.dart';

class ActiveNavTabNotifier extends Notifier<int> {
  @override
  int build() => 0;

  void setTab(int index) {
    state = index;
    // Clear search and close search bar when switching tabs
    ref.read(topBarSearchQueryProvider.notifier).clear();
    ref.read(isTopBarSearchOpenProvider.notifier).setOpen(false);
  }
}

// 0: Dashboard, 1: Vehicles, 2: Inventory, 3: Services
final activeNavTabProvider =
    NotifierProvider<ActiveNavTabNotifier, int>(ActiveNavTabNotifier.new);

class TopBarSearchQueryNotifier extends Notifier<String> {
  @override
  String build() => '';

  void setQuery(String query) => state = query;
  void clear() => state = '';
}

final topBarSearchQueryProvider =
    NotifierProvider<TopBarSearchQueryNotifier, String>(
        TopBarSearchQueryNotifier.new);

class IsTopBarSearchOpenNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void setOpen(bool isOpen) => state = isOpen;
  void toggle() => state = !state;
}

final isTopBarSearchOpenProvider =
    NotifierProvider<IsTopBarSearchOpenNotifier, bool>(
        IsTopBarSearchOpenNotifier.new);

class IsScrolledNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void setScrolled(bool scrolled) {
    if (state != scrolled) state = scrolled;
  }
}

final isScrolledProvider =
    NotifierProvider<IsScrolledNotifier, bool>(IsScrolledNotifier.new);

// Tab Metadata Helpers replicating src/components/nav/types.ts
String getNavTitle(int tabIndex) {
  switch (tabIndex) {
    case 0:
      return 'LaluZ Garage';
    case 1:
      return 'Vehicle Registry';
    case 2:
      return 'Parts Inventory';
    case 3:
      return 'Service History';
    default:
      return 'LaluZ Garage';
  }
}

IconData getTabM3Icon(int tabIndex) {
  switch (tabIndex) {
    case 0:
      return Icons.grid_view_rounded;
    case 1:
      return Icons.directions_car_rounded;
    case 2:
      return Icons.inventory_2_rounded;
    case 3:
      return Icons.build_rounded;
    default:
      return Icons.grid_view_rounded;
  }
}

Color getTabAccentColor(int tabIndex) {
  if (tabIndex == 1) return WorkshopTheme.blueAccent;
  return WorkshopTheme.emeraldAccent;
}

String getTabSearchPlaceholder(int tabIndex) {
  switch (tabIndex) {
    case 1:
      return 'VEHICLE REGISTRY';
    case 2:
      return 'PARTS INVENTORY';
    case 3:
      return 'SERVICE HISTORY';
    default:
      return 'SEARCH';
  }
}

bool isTabSearchable(int tabIndex) {
  return tabIndex == 1 || tabIndex == 2 || tabIndex == 3;
}
