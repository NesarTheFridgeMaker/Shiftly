import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/services/auth_service.dart';
import '../../auth/providers/auth_providers.dart';
import '../../navigation/pages/main_shell.dart';
import 'access_denied_page.dart';
import 'login_page.dart';
import 'splash_page.dart';

enum _AuthGateStatus { checking, signedOut, allowed, denied }

class AuthGate extends ConsumerStatefulWidget {
  const AuthGate({super.key});

  @override
  ConsumerState<AuthGate> createState() {
    return _AuthGateState();
  }
}

class _AuthGateState extends ConsumerState<AuthGate> {
  late final AuthService _authService;
  late final StreamSubscription<AuthState> _authSubscription;

  _AuthGateStatus _status = _AuthGateStatus.checking;
  String? _deniedMessage;

  int _requestId = 0;
  bool _isDenyingAccess = false;

  String? _pushInitializedForUserId;

  @override
  void initState() {
    super.initState();

    _authService = AuthService(Supabase.instance.client);

    _authSubscription = Supabase.instance.client.auth.onAuthStateChange.listen(
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

    unawaited(_evaluateSession(Supabase.instance.client.auth.currentSession));
  }

  Future<void> _evaluateSession(Session? session) async {
    if (session == null && _isDenyingAccess) {
      return;
    }

    final requestId = ++_requestId;

    if (session == null) {
      _pushInitializedForUserId = null;

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
      final result = await _authService.checkEmployeeAccess().timeout(
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

        /*
         * Push ist keine Voraussetzung für den Zugriff
         * auf Dipera.
         *
         * Deshalb wird die Initialisierung bewusst
         * unabhängig vom Login-Flow ausgeführt.
         */
        unawaited(_initializePushForUser(session.user.id));

        return;
      }

      await _denyAndSignOut(
        result.errorMessage ??
            'Dieser Zugang darf die Mitarbeiter-App '
                'nicht verwenden.',
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

  Future<void> _initializePushForUser(String userId) async {
    /*
     * Auth-Events können mehrfach eintreffen.
     * Für denselben angemeldeten Benutzer initialisieren
     * wir Push deshalb nur einmal.
     */
    if (_pushInitializedForUserId == userId) {
      return;
    }

    _pushInitializedForUserId = userId;

    try {
      final service = ref.read(pushNotificationServiceProvider);

      final token = await service.initialize();

      if (token == null) {
        debugPrint(
          'PUSH: Für diesen Benutzer wurde '
          'kein FCM-Token erzeugt.',
        );

        return;
      }

      debugPrint('PUSH: FCM-Token erfolgreich erhalten.');
    } catch (error, stackTrace) {
      /*
       * Push darf niemals verhindern, dass der
       * Mitarbeiter die App verwenden kann.
       */
      debugPrint('PUSH: Initialisierung fehlgeschlagen: $error');

      debugPrintStack(stackTrace: stackTrace);

      /*
       * Bei einem echten Initialisierungsfehler darf
       * später erneut versucht werden.
       */
      _pushInitializedForUserId = null;
    }
  }

  Future<void> _denyAndSignOut(String message, int requestId) async {
    _isDenyingAccess = true;
    _pushInitializedForUserId = null;

    try {
      await _authService.signOut().timeout(const Duration(seconds: 5));
    } catch (_) {
      // Zugriff bleibt auch bei fehlgeschlagenem
      // Sign-out gesperrt.
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
    _pushInitializedForUserId = null;

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
          message:
              _deniedMessage ??
              'Dieser Zugang darf die Mitarbeiter-App '
                  'nicht verwenden.',
          onBackToLogin: _returnToLogin,
        );

      case _AuthGateStatus.signedOut:
        return const LoginPage();
    }
  }
}
