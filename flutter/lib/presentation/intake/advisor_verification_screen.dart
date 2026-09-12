import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/workshop_theme.dart';
import '../../data/repositories/firebase_providers.dart';
import 'intake_wizard_screen.dart';

class AdvisorVerificationScreen extends ConsumerStatefulWidget {
  const AdvisorVerificationScreen({super.key});

  @override
  ConsumerState<AdvisorVerificationScreen> createState() =>
      _AdvisorVerificationScreenState();
}

class _AdvisorVerificationScreenState
    extends ConsumerState<AdvisorVerificationScreen> {
  String _enteredPin = '';
  String? _errorMessage;

  void _onKeyPress(String digit) {
    HapticFeedback.lightImpact();
    if (_enteredPin.length < 4) {
      setState(() {
        _errorMessage = null;
        _enteredPin += digit;
      });

      if (_enteredPin.length == 4) {
        _verifyPin();
      }
    }
  }

  void _onBackspace() {
    HapticFeedback.lightImpact();
    if (_enteredPin.isNotEmpty) {
      setState(() {
        _errorMessage = null;
        _enteredPin = _enteredPin.substring(0, _enteredPin.length - 1);
      });
    }
  }

  Future<void> _verifyPin() async {
    final profile = ref.read(currentUserProfileProvider).value;
    bool isValid = (_enteredPin == AppConstants.defaultAdvisorPin);

    if (!isValid && profile?.pin != null && profile!.pin!.isNotEmpty) {
      if (profile.pin == _enteredPin) isValid = true;
    }

    if (!isValid) {
      // Query team users for matching advisor PIN
      try {
        final firestore = ref.read(firestoreProvider);
        final snap = await firestore
            .collection('users')
            .where('pin', isEqualTo: _enteredPin)
            .limit(1)
            .get();
        if (snap.docs.isNotEmpty) isValid = true;
      } catch (_) {}
    }

    if (isValid) {
      HapticFeedback.mediumImpact();
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const IntakeWizardScreen()),
        );
      }
    } else {
      HapticFeedback.heavyImpact();
      if (mounted) {
        setState(() {
          _errorMessage = 'Invalid advisor PIN. Please re-enter.';
          _enteredPin = '';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WorkshopTheme.darkCanvas,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Advisor Verification',
          style: GoogleFonts.googleSans(fontWeight: FontWeight.w800, fontSize: 16),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(),

            // Ambient Shield Icon with glow
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: WorkshopTheme.blueAccent.withValues(alpha: 0.12),
                shape: BoxShape.circle,
                border: Border.all(
                  color: WorkshopTheme.blueAccent.withValues(alpha: 0.3),
                  width: 1.5,
                ),
              ),
              child: const Center(
                child: Icon(
                  LucideIcons.shieldCheck,
                  size: 40,
                  color: WorkshopTheme.blueAccent,
                ),
              ),
            ),
            const SizedBox(height: 24),

            Text(
              'Enter Advisor PIN',
              style: GoogleFonts.googleSans(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.5,
                color: WorkshopTheme.darkTextPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Authenticate identity before vehicle intake registration',
              style: GoogleFonts.googleSans(
                fontSize: 13,
                color: WorkshopTheme.darkTextMuted,
              ),
            ),
            const SizedBox(height: 32),

            // 4 PIN Indicator Dots
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(4, (index) {
                final isFilled = index < _enteredPin.length;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 10),
                  width: 16,
                  height: 16,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isFilled
                        ? WorkshopTheme.emeraldAccent
                        : WorkshopTheme.darkSurface,
                    border: Border.all(
                      color: isFilled
                          ? WorkshopTheme.emeraldAccent
                          : WorkshopTheme.darkBorder,
                      width: 2,
                    ),
                  ),
                );
              }),
            ),

            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              Text(
                _errorMessage!,
                style: const TextStyle(
                  color: WorkshopTheme.statusUrgent,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ],

            const Spacer(),

            // Numeric Keypad (1-9, Clear, 0, Backspace)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20),
              child: Column(
                children: [
                  _buildKeypadRow(['1', '2', '3']),
                  const SizedBox(height: 16),
                  _buildKeypadRow(['4', '5', '6']),
                  const SizedBox(height: 16),
                  _buildKeypadRow(['7', '8', '9']),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildActionButton(
                        icon: LucideIcons.trash2,
                        onTap: () {
                          HapticFeedback.lightImpact();
                          setState(() {
                            _enteredPin = '';
                            _errorMessage = null;
                          });
                        },
                      ),
                      _buildNumberButton('0'),
                      _buildActionButton(
                        icon: LucideIcons.delete,
                        onTap: _onBackspace,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildKeypadRow(List<String> digits) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: digits.map((d) => _buildNumberButton(d)).toList(),
    );
  }

  Widget _buildNumberButton(String digit) {
    return InkWell(
      onTap: () => _onKeyPress(digit),
      borderRadius: BorderRadius.circular(36),
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          color: WorkshopTheme.darkCard,
          shape: BoxShape.circle,
          border: Border.all(color: WorkshopTheme.darkBorder, width: 1),
        ),
        child: Center(
          child: Text(
            digit,
            style: GoogleFonts.googleSans(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: WorkshopTheme.darkTextPrimary,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton({required IconData icon, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(36),
      child: SizedBox(
        width: 72,
        height: 72,
        child: Center(
          child: Icon(icon, color: WorkshopTheme.darkTextMuted, size: 24),
        ),
      ),
    );
  }
}
