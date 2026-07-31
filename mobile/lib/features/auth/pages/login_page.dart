import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../shared/widgets/dipera_card.dart';
import '../providers/auth_providers.dart';
import '../widgets/login_form.dart';
import '../widgets/login_header.dart';

class LoginPage extends ConsumerWidget {
  const LoginPage({super.key});

  String _getLoginErrorMessage(Object error) {
    if (error is AuthException) {
      final message = error.message.toLowerCase();

      if (message.contains('invalid login credentials')) {
        return 'E-Mail-Adresse oder Passwort ist falsch.';
      }

      if (message.contains('email not confirmed')) {
        return 'Bitte bestätige zuerst deine E-Mail-Adresse.';
      }

      if (message.contains('too many requests') ||
          message.contains('rate limit')) {
        return 'Zu viele Anmeldeversuche. Bitte warte kurz.';
      }

      return error.message;
    }

    return 'Die Anmeldung ist momentan nicht möglich.';
  }

  void _showMessage(
    BuildContext context, {
    required String message,
    bool isError = false,
  }) {
    final messenger = ScaffoldMessenger.of(context);

    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          behavior: SnackBarBehavior.floating,
          backgroundColor: isError
              ? const Color(0xFFB42318)
              : const Color(0xFF027A48),
        ),
      );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final mediaQuery = MediaQuery.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final keyboardIsOpen =
                mediaQuery.viewInsets.bottom > 0;

            final compact =
            constraints.maxHeight < 820 || keyboardIsOpen;

            final horizontalPadding =
                constraints.maxWidth < 380 ? 18.0 : 24.0;

            final verticalPadding = compact ? 16.0 : 28.0;
            final headerCardGap = compact ? 18.0 : 30.0;
            final cardPadding = compact ? 18.0 : 24.0;
            final titleFormGap = compact ? 20.0 : 28.0;

            final minimumContentHeight =
                constraints.maxHeight - (verticalPadding * 2);

            return SingleChildScrollView(
            keyboardDismissBehavior:
            ScrollViewKeyboardDismissBehavior.onDrag,
            physics: keyboardIsOpen
            ? const ClampingScrollPhysics()
            : const NeverScrollableScrollPhysics(),
              padding: EdgeInsets.symmetric(
                horizontal: horizontalPadding,
                vertical: verticalPadding,
              ),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: minimumContentHeight > 0
                      ? minimumContentHeight
                      : 0,
                ),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(
                      maxWidth: 420,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        LoginHeader(
                          compact: compact,
                        ),
                        SizedBox(height: headerCardGap),
                        DiperaCard(
                          padding: EdgeInsets.zero,
                          child: Padding(
                            padding: EdgeInsets.all(cardPadding),
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Schön, dass du da bist 👋',
                                  style: theme
                                      .textTheme
                                      .headlineSmall
                                      ?.copyWith(
                                    color: const Color(0xFF101828),
                                    fontWeight: FontWeight.w700,
                                    fontSize: compact ? 22 : null,
                                  ),
                                ),
                                SizedBox(
                                  height: compact ? 6 : 8,
                                ),
                                Text(
                                  'Melde dich an, um deine '
                                  'Arbeitszeiten, Schichten und '
                                  'Urlaubsanträge im Blick zu behalten.',
                                  style: theme.textTheme.bodyLarge
                                      ?.copyWith(
                                    color: const Color(0xFF667085),
                                    height: 1.4,
                                    fontSize: compact ? 14 : null,
                                  ),
                                ),
                                SizedBox(height: titleFormGap),
                                LoginForm(
                                  compact: compact,
                                  onLogin: ({
                                    required String email,
                                    required String password,
                                  }) async {
                                    try {
                                      await ref
                                          .read(authServiceProvider)
                                          .signIn(
                                            email: email,
                                            password: password,
                                          );
                                    } catch (error) {
                                      if (!context.mounted) {
                                        return;
                                      }

                                      _showMessage(
                                        context,
                                        message:
                                            _getLoginErrorMessage(
                                          error,
                                        ),
                                        isError: true,
                                      );

                                      rethrow;
                                    }
                                  },
                                  onForgotPassword: () {
                                    _showMessage(
                                      context,
                                      message:
                                          'Das Zurücksetzen des '
                                          'Passworts folgt später.',
                                    );
                                  },
                                ),
                                SizedBox(
                                  height: compact ? 14 : 20,
                                ),
                                Center(
                                  child: TextButton(
                                    onPressed: () {
                                      _showMessage(
                                        context,
                                        message:
                                            'Das Erstellen eines '
                                            'Kontos über eine '
                                            'Einladung folgt später.',
                                      );
                                    },
                                    style: TextButton.styleFrom(
                                      padding:
                                          const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 6,
                                      ),
                                      minimumSize: Size.zero,
                                      tapTargetSize:
                                          MaterialTapTargetSize
                                              .shrinkWrap,
                                    ),
                                    child: const Text(
                                      'Einladung erhalten? '
                                      'Konto erstellen',
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}