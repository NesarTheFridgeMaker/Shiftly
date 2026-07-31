import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../features/auth/pages/auth_gate.dart';
import '../shared/theme/app_colors.dart';
import '../shared/theme/app_theme.dart';
import '../shared/widgets/dipera_button.dart';
import '../shared/widgets/dipera_card.dart';
import '../shared/widgets/dipera_text_field.dart';

class DiperaApp extends StatelessWidget {
  const DiperaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Color(0xFFF6F8FB),
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
        systemNavigationBarColor: Colors.white,
        systemNavigationBarIconBrightness: Brightness.dark,
        systemNavigationBarDividerColor: Colors.transparent,
      ),
      child: MaterialApp(
        title: 'Dipera',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        home: const AuthGate(),
      ),
    );
  }
}

class _ThemePreviewPage extends StatefulWidget {
  const _ThemePreviewPage();

  @override
  State<_ThemePreviewPage> createState() => _ThemePreviewPageState();
}

class _ThemePreviewPageState extends State<_ThemePreviewPage> {
  final TextEditingController _emailController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      appBar: AppBar(
        title: const Text('Dipera'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Willkommen bei Dipera',
                style: theme.textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Text(
                'Die mobile Zeiterfassung für dein Unternehmen.',
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 32),
              DiperaTextField(
                controller: _emailController,
                label: 'E-Mail-Adresse',
                hint: 'name@unternehmen.de',
                prefixIcon: const Icon(
                  Icons.mail_outline_rounded,
                ),
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 20),
              DiperaCard(
                accentColor: AppColors.warning,
                onTap: () {
                  _showMessage(
                    'Heute-Details werden später geöffnet.',
                  );
                },
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.warningLight,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(
                        Icons.schedule_rounded,
                        color: AppColors.warning,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Heute',
                            style: theme.textTheme.titleMedium,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Noch nicht eingestempelt',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.chevron_right_rounded,
                      color: AppColors.textMuted,
                    ),
                  ],
                ),
              ),
              const Spacer(),
              DiperaButton(
                text: 'Arbeit starten',
                icon: const Icon(
                  Icons.play_arrow_rounded,
                  size: 22,
                ),
                onPressed: () {
                  _showMessage(
                    'Die Zeiterfassung wird bald verbunden.',
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}