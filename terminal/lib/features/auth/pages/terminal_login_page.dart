import 'package:flutter/material.dart';

import '../../../core/services/terminal_auth_service.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/dipera_button.dart';
import '../../../shared/widgets/dipera_card.dart';
import '../../../shared/widgets/dipera_text_field.dart';

class TerminalLoginPage extends StatefulWidget {
  const TerminalLoginPage({
    required this.authService,
    required this.onLoggedIn,
    this.startupError,
    super.key,
  });

  final TerminalAuthService authService;
  final Future<void> Function(TerminalAdminProfile) onLoggedIn;
  final Object? startupError;

  @override
  State<TerminalLoginPage> createState() => _TerminalLoginPageState();
}

class _TerminalLoginPageState extends State<TerminalLoginPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();

  bool _loading = false;
  bool _obscure = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.startupError != null) {
      _error = widget.startupError.toString();
    }
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_loading) return;

    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Bitte gib E-Mail-Adresse und Passwort ein.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final profile = await widget.authService.signIn(
        email: _email.text,
        password: _password.text,
      );
      await widget.onLoggedIn(profile);
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error is TerminalAuthException
              ? error.message
              : 'Die Anmeldung ist fehlgeschlagen.';
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Column(
                children: [
                  Container(
                    width: 74,
                    height: 74,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [
                          AppColors.gradientStart,
                          AppColors.gradientEnd,
                        ],
                      ),
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: const Icon(
                      Icons.access_time_filled_rounded,
                      color: Colors.white,
                      size: 36,
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    'Dipera Terminal',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Einmal anmelden, danach stempeln Mitarbeiter per PIN.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 28),
                  DiperaCard(
                    padding: const EdgeInsets.all(28),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Terminal einrichten',
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Melde dich mit einem Admin- oder Owner-Konto an. '
                          'Der Betrieb wird automatisch erkannt.',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: AppColors.textSecondary,
                            height: 1.45,
                          ),
                        ),
                        const SizedBox(height: 24),
                        DiperaTextField(
                          controller: _email,
                          label: 'E-Mail-Adresse',
                          hint: 'name@unternehmen.de',
                          prefixIcon: const Icon(Icons.mail_outline_rounded),
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          enabled: !_loading,
                        ),
                        const SizedBox(height: 18),
                        DiperaTextField(
                          controller: _password,
                          label: 'Passwort',
                          prefixIcon: const Icon(Icons.lock_outline_rounded),
                          suffixIcon: IconButton(
                            onPressed: () {
                              setState(() => _obscure = !_obscure);
                            },
                            icon: Icon(
                              _obscure
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                          ),
                          obscureText: _obscure,
                          textInputAction: TextInputAction.done,
                          enabled: !_loading,
                          onSubmitted: (_) => _submit(),
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 16),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.dangerLight,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Text(
                              _error!,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: AppColors.danger,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 24),
                        DiperaButton(
                          text: 'Terminal anmelden',
                          icon: const Icon(Icons.login_rounded),
                          isLoading: _loading,
                          onPressed: _submit,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
