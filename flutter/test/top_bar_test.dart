import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:laluz_garage/core/theme/workshop_theme.dart';
import 'package:laluz_garage/data/models/workshop_user.dart';
import 'package:laluz_garage/data/repositories/firebase_providers.dart';
import 'package:laluz_garage/presentation/shell/navigation_provider.dart';
import 'package:laluz_garage/presentation/shell/mobile_top_bar.dart';

void main() {
  final mockUser = WorkshopUser(
    id: 'u1',
    name: 'Rohan Sharma',
    email: 'rohan@laluz.com',
    status: 'online',
    role: 'admin',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  );

  group('Navigation Tab Helpers Tests', () {
    test('Tab title mappings match React implementation', () {
      expect(getNavTitle(0), 'LaluZ Garage');
      expect(getNavTitle(1), 'Vehicle Registry');
      expect(getNavTitle(2), 'Parts Inventory');
      expect(getNavTitle(3), 'Service History');
    });

    test('Tab icons match M3 rounded specifications', () {
      expect(getTabM3Icon(0), Icons.grid_view_rounded);
      expect(getTabM3Icon(1), Icons.directions_car_rounded);
      expect(getTabM3Icon(2), Icons.inventory_2_rounded);
      expect(getTabM3Icon(3), Icons.build_rounded);
    });

    test('Tab accent colors match React theme tokens', () {
      expect(getTabAccentColor(0), WorkshopTheme.emeraldAccent);
      expect(getTabAccentColor(1), WorkshopTheme.blueAccent);
      expect(getTabAccentColor(2), WorkshopTheme.emeraldAccent);
      expect(getTabAccentColor(3), WorkshopTheme.emeraldAccent);
    });

    test('Tab searchability rules', () {
      expect(isTabSearchable(0), false);
      expect(isTabSearchable(1), true);
      expect(isTabSearchable(2), true);
      expect(isTabSearchable(3), true);
    });
  });

  group('MobileTopBar Widget Tests', () {
    testWidgets('Renders LaluZ Garage title on Dashboard without search icon',
        (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProfileProvider
                .overrideWith((ref) => Stream.value(mockUser)),
          ],
          child: const MaterialApp(
            home: Scaffold(
              appBar: MobileTopBar(),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('LaluZ Garage'), findsOneWidget);
      expect(find.byIcon(Icons.grid_view_rounded), findsOneWidget);
      // Search trigger button should NOT be visible on Dashboard (Tab 0)
      expect(find.byKey(const ValueKey('search_btn')), findsNothing);
      // User avatar initial letter 'R'
      expect(find.text('R'), findsOneWidget);
    });

    testWidgets(
        'Renders search icon on Vehicle tab and opens expandable search drawer',
        (tester) async {
      final container = ProviderContainer(
        overrides: [
          currentUserProfileProvider
              .overrideWith((ref) => Stream.value(mockUser)),
        ],
      );
      // Set to tab 1 (Vehicles)
      container.read(activeNavTabProvider.notifier).setTab(1);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: Scaffold(
              appBar: MobileTopBar(),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Title should now be Vehicle Registry
      expect(find.text('Vehicle Registry'), findsOneWidget);
      expect(find.byIcon(Icons.directions_car_rounded), findsOneWidget);

      // Search button should now be visible
      final searchButton = find.byKey(const ValueKey('search_btn'));
      expect(searchButton, findsOneWidget);

      // Tap search button to open sticky search drawer
      await tester.tap(searchButton);
      await tester.pumpAndSettle();

      // Expandable search bar should be open
      expect(container.read(isTopBarSearchOpenProvider), true);
      expect(find.byType(TextField), findsOneWidget);

      // Type search query
      await tester.enterText(find.byType(TextField), 'MH12');
      await tester.pump();

      expect(container.read(topBarSearchQueryProvider), 'MH12');

      // Tap close (X) button
      final closeButton = find.byIcon(LucideIcons.x);
      expect(closeButton, findsOneWidget);
      await tester.tap(closeButton);
      await tester.pumpAndSettle();

      expect(container.read(isTopBarSearchOpenProvider), false);
      expect(container.read(topBarSearchQueryProvider), '');

      container.dispose();
    });
  });
}
