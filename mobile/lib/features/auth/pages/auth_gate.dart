import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/services/auth_service.dart';
import '../../navigation/pages/main_shell.dart';
import 'access_denied_page.dart';
import 'login_page.dart';
import 'splash_page.dart';

enum _AuthGateStatus {
  checking,
  signedOut,
  allowed,
  denied,
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  late final AuthService _authService;
  late final StreamSubscription<AuthState> _authSubscription;

  _AuthGateStatus _status = _AuthGateStatus.checking;
  String? _deniedMessage;

  int _requestId = 0;
  bool _isDenyingAccess = false;

  @override
  void initState() {
    super.initState();

    _authService = AuthService(
      Supabase.instance.client,
    );

    _authSubscription =
        Supabase.instance.client.auth.onAuthStateChange.listen(
      (authState) {
        unawaited(_evaluateSession(authState.session));
      },
      onError: (Object error, StackTrace stackTrace) {
        _showDenied(
          'Die Anmeldung konnte nicht sicher geprüft werden. '
          'Bitte versuche es erneut.',
        );
      },
    );

    unawaited(
      _evaluateSession(
        Supabase.instance.client.auth.currentSession,
      ),
    );
  }

  Future<void> _evaluateSession(Session? session) async {
    if (session == null && _isDenyingAccess) {
      return;
    }

    final requestId = ++_requestId;

    if (session == null) {
      if (!mounted || requestId != _requestId) {
        return;
      }

      setState(() {
        _status = _AuthGateStatus.signedOut;
        _deniedMessage = null;
      });

      return;
    }

    if (mounted) {
      setState(() {
        _status = _AuthGateStatus.checking;
        _deniedMessage = null;
      });
    }

    try {
      final result = await _authService
          .checkEmployeeAccess()
          .timeout(
            const Duration(seconds: 10),
          );

      if (!mounted || requestId != _requestId) {
        return;
      }

      if (result.isAllowed) {
        setState(() {
          _status = _AuthGateStatus.allowed;
          _deniedMessage = null;
        });

        return;
      }

      await _denyAndSignOut(
        result.errorMessage ??
            'Dieser Zugang darf die Mitarbeiter-App nicht verwenden.',
        requestId,
      );
    } on TimeoutException {
      if (!mounted || requestId != _requestId) {
        return;
      }

      _showDenied(
        'Die Prüfung des Mitarbeiterkontos dauert zu lange. '
        'Bitte prüfe deine Internetverbindung und die '
        'Supabase-Berechtigungen.',
      );
    } on PostgrestException catch (error) {
      if (!mounted || requestId != _requestId) {
        return;
      }

      _showDenied(
        'Das Mitarbeiterprofil konnte nicht geladen werden: '
        '${error.message}',
      );
    } catch (error) {
      if (!mounted || requestId != _requestId) {
        return;
      }

      _showDenied(
        'Der Mitarbeiterzugang konnte nicht geprüft werden. '
        'Technischer Fehler: $error',
      );
    }
  }

  Future<void> _denyAndSignOut(
    String message,
    int requestId,
  ) async {
    _isDenyingAccess = true;

    try {
      await _authService.signOut().timeout(
            const Duration(seconds: 5),
          );
    } catch (_) {
      // Der Zugriff bleibt auch dann gesperrt,
      // wenn das Abmelden vorübergehend fehlschlägt.
    }

    if (!mounted || requestId != _requestId) {
      _isDenyingAccess = false;
      return;
    }

    setState(() {
      _status = _AuthGateStatus.denied;
      _deniedMessage = message;
    });

    _isDenyingAccess = false;
  }

  void _showDenied(String message) {
    if (!mounted) {
      return;
    }

    setState(() {
      _status = _AuthGateStatus.denied;
      _deniedMessage = message;
    });
  }

  void _returnToLogin() {
    _requestId++;

    setState(() {
      _status = _AuthGateStatus.signedOut;
      _deniedMessage = null;
    });
  }

  @override
  void dispose() {
    _requestId++;
    _authSubscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    switch (_status) {
      case _AuthGateStatus.checking:
        return const SplashPage();

      case _AuthGateStatus.allowed:
        return const MainShell();

      case _AuthGateStatus.denied:
        return AccessDeniedPage(
          message: _deniedMessage ??
              'Dieser Zugang darf die Mitarbeiter-App nicht verwenden.',
          onBackToLogin: _returnToLogin,
        );

      case _AuthGateStatus.signedOut:
        return const LoginPage();
    }
  }
}