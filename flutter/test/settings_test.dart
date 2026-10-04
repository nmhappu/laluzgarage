import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:laluz_garage/core/theme/workshop_theme.dart';
import 'package:laluz_garage/presentation/settings/views/general_view.dart';
import 'package:laluz_garage/presentation/settings/views/system_view.dart';
import 'package:laluz_garage/presentation/settings/dialogs/delete_user_dialog.dart';
import 'package:laluz_garage/presentation/settings/dialogs/logout_dialog.dart';

void main() {
  group('Settings Views Widget Tests', () {
    testWidgets('GeneralView renders workshop identifier, currency, and GST', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: WorkshopTheme.darkTheme,
          home: const Scaffold(body: GeneralView()),
        ),
      );

      expect(find.text('Workshop Identifier'), findsOneWidget);
      expect(find.text('LaluZ Garage'), findsOneWidget);
      expect(find.text('Base Currency'), findsOneWidget);
      expect(find.text('INR (₹)'), findsOneWidget);
      expect(find.text('GST Billing Integration'), findsOneWidget);
      expect(find.text('18% (GST)'), findsOneWidget);
    });

    testWidgets('SystemView renders database ID and active badges', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: WorkshopTheme.darkTheme,
          home: const Scaffold(body: SystemView()),
        ),
      );

      expect(find.text('Firestore Database'), findsOneWidget);
      expect(find.text('ai-studio-68b1ba2c-7611-4e4f-b6eb-ac12f212fa4e'), findsOneWidget);
      expect(find.text('Authentication Provider'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
      expect(find.text('Connected'), findsOneWidget);
      expect(find.text('Production'), findsOneWidget);
    });

    testWidgets('DeleteUserDialog renders title and buttons correctly', (tester) async {
      bool confirmCalled = false;
      await tester.pumpWidget(
        MaterialApp(
          theme: WorkshopTheme.darkTheme,
          home: Scaffold(
            body: DeleteUserDialog(
              userId: 'u123',
              userName: 'Test Advisor',
              onConfirm: (id, name) async {
                confirmCalled = true;
                return true;
              },
            ),
          ),
        ),
      );

      expect(find.text('Delete Advisor?'), findsOneWidget);
      expect(find.text('CANCEL'), findsOneWidget);
      expect(find.text('DELETE'), findsOneWidget);

      await tester.tap(find.text('DELETE'));
      await tester.pumpAndSettle();
      expect(confirmCalled, isTrue);
    });

    testWidgets('LogoutDialog renders confirmation and cancel buttons', (tester) async {
      bool logoutCalled = false;
      await tester.pumpWidget(
        MaterialApp(
          theme: WorkshopTheme.darkTheme,
          home: Scaffold(
            body: LogoutDialog(
              onConfirm: () async {
                logoutCalled = true;
              },
            ),
          ),
        ),
      );

      expect(find.text('END SESSION?'), findsOneWidget);
      expect(find.text('CANCEL'), findsOneWidget);
      expect(find.text('LOG OUT'), findsOneWidget);

      await tester.tap(find.text('LOG OUT'));
      await tester.pumpAndSettle();
      expect(logoutCalled, isTrue);
    });
  });
}
