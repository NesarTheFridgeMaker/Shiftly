import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/dipera_button.dart';
import '../../../shared/widgets/dipera_card.dart';
import '../../../shared/widgets/dipera_text_field.dart';
import '../providers/auth_providers.dart';
import 'registration_confirmation_page.dart';

const _minPasswordLength = 8;

class EmployeeRegisterPage extends ConsumerStatefulWidget {
  const EmployeeRegisterPage({super.key});

  @override
  ConsumerState<EmployeeRegisterPage> createState() =>
      _EmployeeRegisterPageState();
}

class _EmployeeRegisterPageState
    extends ConsumerState<EmployeeRegisterPage> {
  final _invite = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _repeat = TextEditingController();

  bool _inviteValidated = false;
  bool _validating = false;
  bool _saving = false;
  bool _showPassword = false;
  bool _showRepeat = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _password.addListener(_refresh);
    _repeat.addListener(_refresh);
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _password.removeListener(_refresh);
    _repeat.removeListener(_refresh);
    _invite.dispose();
    _email.dispose();
    _password.dispose();
    _repeat.dispose();
    super.dispose();
  }

  bool get _minLength => _password.text.length >= _minPasswordLength;
  bool get _lower => RegExp(r'[a-zäöüß]').hasMatch(_password.text);
  bool get _upper => RegExp(r'[A-ZÄÖÜ]').hasMatch(_password.text);
  bool get _number => RegExp(r'\d').hasMatch(_password.text);
  bool get _special =>
      RegExp(r'[^A-Za-zÄÖÜäöüß0-9]').hasMatch(_password.text);
  bool get _passwordValid =>
      _minLength && _lower && _upper && _number && _special;
  bool get _match =>
      _repeat.text.isNotEmpty && _password.text == _repeat.text;

  Future<void> _validateInvite() async {
    setState(() {
      _validating = true;
      _error = null;
    });

    try {
      await ref
          .read(employeeRegistrationServiceProvider)
          .validateInviteCode(_invite.text);

      if (!mounted) return;

      setState(() {
        _inviteValidated = true;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _error = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _validating = false;
        });
      }
    }
  }

  Future<void> _register() async {
    if (!_inviteValidated || _saving) return;

    if (_email.text.trim().isEmpty) {
      setState(() {
        _error = 'Bitte gib deine E-Mail-Adresse ein.';
      });
      return;
    }

    if (!_passwordValid) {
      setState(() {
        _error =
            'Das Passwort erfüllt noch nicht alle Sicherheitsanforderungen.';
      });
      return;
    }

    if (!_match) {
      setState(() {
        _error = 'Die beiden Passwörter stimmen nicht überein.';
      });
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final email = await ref
          .read(employeeRegistrationServiceProvider)
          .registerEmployee(
            inviteCode: _invite.text,
            email: _email.text,
            password: _password.text,
          );

      if (!mounted) return;

      await Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => RegistrationConfirmationPage(
            email: email,
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _error = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Konto erstellen'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: DiperaCard(
                padding: const EdgeInsets.all(22),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _inviteValidated
                          ? 'Zugangsdaten festlegen'
                          : 'Einladung prüfen',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _inviteValidated
                          ? 'Deine Einladung ist gültig. Erstelle jetzt deinen Dipera-Zugang.'
                          : 'Gib den Einladungscode ein, den du von deinem Betrieb erhalten hast.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 22),
                    if (!_inviteValidated) ...[
                      DiperaTextField(
                        controller: _invite,
                        label: 'Einladungscode',
                        prefixIcon:
                            const Icon(Icons.vpn_key_outlined),
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _validateInvite(),
                      ),
                      const SizedBox(height: 18),
                      DiperaButton(
                        text: 'Einladung prüfen',
                        icon: const Icon(Icons.verified_outlined),
                        isLoading: _validating,
                        onPressed: _validateInvite,
                      ),
                    ] else ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.successLight,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.check_circle_outline_rounded,
                              color: AppColors.success,
                            ),
                            const SizedBox(width: 10),
                            const Expanded(
                              child: Text(
                                'Einladung erfolgreich geprüft.',
                              ),
                            ),
                            TextButton(
                              onPressed: () {
                                setState(() {
                                  _inviteValidated = false;
                                  _error = null;
                                });
                              },
                              child: const Text('Ändern'),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      DiperaTextField(
                        controller: _email,
                        label: 'E-Mail-Adresse',
                        prefixIcon:
                            const Icon(Icons.mail_outline_rounded),
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                      ),
                      const SizedBox(height: 16),
                      DiperaTextField(
                        controller: _password,
                        label: 'Passwort',
                        prefixIcon:
                            const Icon(Icons.lock_outline_rounded),
                        suffixIcon: IconButton(
                          onPressed: () {
                            setState(() {
                              _showPassword = !_showPassword;
                            });
                          },
                          icon: Icon(
                            _showPassword
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                          ),
                        ),
                        obscureText: !_showPassword,
                        textInputAction: TextInputAction.next,
                      ),
                      const SizedBox(height: 12),
                      _Requirement(
                        ok: _minLength,
                        text:
                            'Mindestens $_minPasswordLength Zeichen',
                      ),
                      _Requirement(
                        ok: _lower,
                        text: 'Mindestens ein Kleinbuchstabe',
                      ),
                      _Requirement(
                        ok: _upper,
                        text: 'Mindestens ein Großbuchstabe',
                      ),
                      _Requirement(
                        ok: _number,
                        text: 'Mindestens eine Zahl',
                      ),
                      _Requirement(
                        ok: _special,
                        text: 'Mindestens ein Sonderzeichen',
                      ),
                      const SizedBox(height: 12),
                      DiperaTextField(
                        controller: _repeat,
                        label: 'Passwort wiederholen',
                        prefixIcon:
                            const Icon(Icons.lock_reset_rounded),
                        suffixIcon: IconButton(
                          onPressed: () {
                            setState(() {
                              _showRepeat = !_showRepeat;
                            });
                          },
                          icon: Icon(
                            _showRepeat
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                          ),
                        ),
                        obscureText: !_showRepeat,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _register(),
                      ),
                      if (_repeat.text.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(
                              _match
                                  ? Icons.check_circle_rounded
                                  : Icons.error_outline_rounded,
                              size: 17,
                              color: _match
                                  ? AppColors.success
                                  : AppColors.danger,
                            ),
                            const SizedBox(width: 7),
                            Expanded(
                              child: Text(
                                _match
                                    ? 'Die Passwörter stimmen überein.'
                                    : 'Die Passwörter stimmen nicht überein.',
                                style: theme.textTheme.bodySmall
                                    ?.copyWith(
                                  color: _match
                                      ? AppColors.success
                                      : AppColors.danger,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 22),
                      DiperaButton(
                        text: 'Konto erstellen',
                        icon: const Icon(
                          Icons.person_add_alt_1_rounded,
                        ),
                        isLoading: _saving,
                        onPressed: _register,
                      ),
                    ],
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
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Requirement extends StatelessWidget {
  const _Requirement({
    required this.ok,
    required this.text,
  });

  final bool ok;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 7),
      child: Row(
        children: [
          Icon(
            ok
                ? Icons.check_circle_rounded
                : Icons.radio_button_unchecked_rounded,
            size: 17,
            color:
                ok ? AppColors.success : AppColors.textMuted,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: ok
                        ? AppColors.success
                        : AppColors.textSecondary,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
