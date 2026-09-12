import 'package:flutter/material.dart';
import 'package:m3e_core/m3e_core.dart';

import '../../core/theme/workshop_theme.dart';

class WavyProgressIndicator extends StatelessWidget {
  final int currentStep; // 1, 2, or 3
  final int totalSteps;

  const WavyProgressIndicator({
    super.key,
    required this.currentStep,
    this.totalSteps = 3,
  });

  @override
  Widget build(BuildContext context) {
    final progress = (currentStep / totalSteps).clamp(0.0, 1.0);

    return SizedBox(
      height: 15,
      width: double.infinity,
      child: M3ELinearWavyProgressIndicator(
        value: progress,
        color: WorkshopTheme.emeraldAccent,
        backgroundColor: WorkshopTheme.darkBorder,
        strokeWidth: 4.0,
        trackStrokeWidth: 4.0,
        gapSize: 4.0,
        stopSize: 4.0,
        amplitude: (_) => 1.0,
        wavelength: 36.0,
        waveSpeed: 22.0,
        height: 20.0,
      ),
    );
  }
}
