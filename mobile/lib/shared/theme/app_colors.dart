import 'package:flutter/material.dart';

abstract final class AppColors {
  // Markenfarben
  static const Color primary = Color(0xFF2563EB);
  static const Color primaryDark = Color(0xFF1D4ED8);
  static const Color primaryLight = Color(0xFFDBEAFE);

  // Akzentfarben für verschiedene Dipera-Bereiche
  static const Color success = Color(0xFF16A34A);
  static const Color successLight = Color(0xFFDCFCE7);

  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFEF3C7);

  static const Color danger = Color(0xFFDC2626);
  static const Color dangerLight = Color(0xFFFEE2E2);

  static const Color purple = Color(0xFF7C3AED);
  static const Color purpleLight = Color(0xFFEDE9FE);

  static const Color turquoise = Color(0xFF0891B2);
  static const Color turquoiseLight = Color(0xFFCFFAFE);

  // Neutrale Farben
  static const Color background = Color(0xFFF7F8FC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceMuted = Color(0xFFF1F5F9);

  static const Color textPrimary = Color(0xFF172033);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textMuted = Color(0xFF94A3B8);

  static const Color border = Color(0xFFE2E8F0);
  static const Color divider = Color(0xFFE8EDF4);

  // Später für Verläufe und besondere Flächen
  static const Color gradientStart = Color(0xFF2563EB);
  static const Color gradientEnd = Color(0xFF7C3AED);

  const AppColors._();
}