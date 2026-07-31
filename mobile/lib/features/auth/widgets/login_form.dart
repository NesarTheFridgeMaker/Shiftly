import 'package:flutter/material.dart';

import '../../../shared/widgets/dipera_button.dart';
import '../../../shared/widgets/dipera_text_field.dart';

class LoginForm extends StatefulWidget {
  const LoginForm({
    super.key,
    required this.onLogin,
    required this.onForgotPassword,
    this.compact = false,
  });

  final Future<void> Function({
    required String email,
    required String password,
  }) onLogin;

  final VoidCallback onForgotPassword;
  final bool compact;

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _formKey = GlobalKey<FormState>();

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  final _emailFocusNode = FocusNode();
  final _passwordFocusNode = FocusNode();

  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _emailFocusNode.dispose();
    _passwordFocusNode.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();

    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      await widget.onLogin(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
    } catch (_) {
      // Die konkrete Fehlermeldung zeigt die LoginPage.
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';

    if (email.isEmpty) {
      return 'Bitte gib deine E-Mail-Adresse ein.';
    }

    final emailPattern = RegExp(
      r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$',
    );

    if (!emailPattern.hasMatch(email)) {
      return 'Bitte gib eine gültige E-Mail-Adresse ein.';
    }

    return null;
  }

  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Bitte gib dein Passwort ein.';
    }

    if (value.length < 6) {
      return 'Das Passwort muss mindestens 6 Zeichen enthalten.';
    }

    return null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final fieldGap = widget.compact ? 14.0 : 20.0;
    final forgotPasswordGap = widget.compact ? 4.0 : 12.0;
    final buttonGap = widget.compact ? 12.0 : 20.0;

    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DiperaTextField(
            controller: _emailController,
            focusNode: _emailFocusNode,
            label: 'E-Mail-Adresse',
            hint: 'name@unternehmen.de',
            prefixIcon: const Icon(
              Icons.mail_outline_rounded,
            ),
            validator: _validateEmail,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            autocorrect: false,
            enableSuggestions: false,
            onSubmitted: (_) {
              _passwordFocusNode.requestFocus();
            },
          ),
          SizedBox(height: fieldGap),
          DiperaTextField(
            controller: _passwordController,
            focusNode: _passwordFocusNode,
            label: 'Passwort',
            hint: 'Dein Passwort',
            prefixIcon: const Icon(
              Icons.lock_outline_rounded,
            ),
            suffixIcon: IconButton(
              tooltip: _obscurePassword
                  ? 'Passwort anzeigen'
                  : 'Passwort ausblenden',
              onPressed: () {
                setState(() {
                  _obscurePassword = !_obscurePassword;
                });
              },
              icon: Icon(
                _obscurePassword
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
                color: const Color(0xFF667085),
                size: 22,
              ),
            ),
            validator: _validatePassword,
            obscureText: _obscurePassword,
            textInputAction: TextInputAction.done,
            autocorrect: false,
            enableSuggestions: false,
            onSubmitted: (_) {
              _submit();
            },
          ),
          SizedBox(height: forgotPasswordGap),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: _isLoading
                  ? null
                  : widget.onForgotPassword,
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFF2457F5),
                padding: const EdgeInsets.symmetric(
                  horizontal: 4,
                  vertical: 6,
                ),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                'Passwort vergessen?',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: const Color(0xFF2457F5),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          SizedBox(height: buttonGap),
          DiperaButton(
            text: 'Anmelden',
            icon: const Icon(
              Icons.lock_open_rounded,
              size: 21,
            ),
            isLoading: _isLoading,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}