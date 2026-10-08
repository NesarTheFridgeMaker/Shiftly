
import 'dart:async';

import 'package:flutter/foundation.dart';
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
  String? _pushInitializingForUserId;

  int _pushRequestId = 0;

  static const int _maxPushAttempts = 3;
  static const Duration _pushRetryDelay = Duration(seconds: 10);

  @override
  void initState() {
    super.initState();

    _authService = AuthService(Supabase.instance.client);

    _authSubscription = Supabase.instance.client.auth.onAuthStateChange.listen(
      (authState) {
        unawaited(_evaluateSession(authState.session));
      },
      onError: (Object error, StackTrace stackTrace) {
        if (kDebugMode) {
          debugPrint('AUTH: Auth-State-Stream fehlgeschlagen: $error');
          debugPrintStack(stackTrace: stackTrace);
        }

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

  void _resetPushInitialization() {
    _pushRequestId++;
    _pushInitializedForUserId = null;
    _pushInitializingForUserId = null;
  }

  bool _isPushRequestValid(String userId, int pushRequestId) {
    return mounted &&
        pushRequestId == _pushRequestId &&
        _pushInitializingForUserId == userId &&
        Supabase.instance.client.auth.currentUser?.id == userId;
  }

  Future<void> _evaluateSession(Session? session) async {
    if (session == null && _isDenyingAccess) {
      return;
    }

    final requestId = ++_requestId;

    if (session == null) {
      _resetPushInitialization();

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
         * Deshalb läuft die Push-Initialisierung
         * unabhängig vom Login-Flow.
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
        'Bitte prüfe deine Internetverbindung und versuche '
        'es erneut.',
      );
    } on PostgrestException catch (error, stackTrace) {
      if (kDebugMode) {
        debugPrint(
          'AUTH: Mitarbeiterprofil konnte nicht geladen werden: '
          '${error.message}',
        );
        debugPrintStack(stackTrace: stackTrace);
      }

      if (!mounted || requestId != _requestId) {
        return;
      }

      _showDenied(
        'Das Mitarbeiterprofil konnte nicht geladen werden. '
        'Bitte versuche es erneut.',
      );
    } catch (error, stackTrace) {
      if (kDebugMode) {
        debugPrint(
          'AUTH: Mitarbeiterzugang konnte nicht geprüft werden: '
          '$error',
        );
        debugPrintStack(stackTrace: stackTrace);
      }

      if (!mounted || requestId != _requestId) {
        return;
      }

      _showDenied(
        'Der Mitarbeiterzugang konnte nicht geprüft werden. '
        'Bitte versuche es erneut.',
      );
    }
  }

  Future<void> _initializePushForUser(String userId) async {
    /*
     * Bereits erfolgreich initialisiert:
     * kein weiterer Versuch erforderlich.
     */
    if (_pushInitializedForUserId == userId) {
      return;
    }

    /*
     * Verhindert parallele Initialisierungen
     * durch mehrere Auth-Events.
     */
    if (_pushInitializingForUserId == userId) {
      return;
    }

    /*
     * Ein Benutzerwechsel macht frühere
     * Initialisierungsversuche ungültig.
     */
    _pushRequestId++;

    final pushRequestId = _pushRequestId;

    _pushInitializingForUserId = userId;

    try {
      final service = ref.read(pushNotificationServiceProvider);

      for (var attempt = 1; attempt <= _maxPushAttempts; attempt++) {
        if (!_isPushRequestValid(userId, pushRequestId)) {
          return;
        }

        if (kDebugMode) {
          debugPrint(
            'PUSH: Initialisierungsversuch '
            '$attempt/$_maxPushAttempts.',
          );
        }

        String? token;

        try {
          token = await service.initialize();
        } catch (error, stackTrace) {
          if (kDebugMode) {
            debugPrint(
              'PUSH: Initialisierungsversuch '
              '$attempt fehlgeschlagen: $error',
            );
            debugPrintStack(stackTrace: stackTrace);
          }
        }

        if (!_isPushRequestValid(userId, pushRequestId)) {
          return;
        }

        if (token != null && token.isNotEmpty) {
          _pushInitializedForUserId = userId;

          if (kDebugMode) {
            debugPrint(
              'PUSH: FCM-Token erfolgreich erhalten '
              'bei Versuch $attempt.',
            );
          }

          return;
        }

        if (attempt < _maxPushAttempts) {
          if (kDebugMode) {
            debugPrint(
              'PUSH: Kein Token erhalten. '
              'Nächster Versuch in '
              '${_pushRetryDelay.inSeconds} Sekunden.',
            );
          }

          await Future<void>.delayed(_pushRetryDelay);
        }
      }

      if (kDebugMode) {
        debugPrint(
          'PUSH: Nach $_maxPushAttempts Versuchen '
          'kein FCM-Token erhalten.',
        );
      }
    } catch (error, stackTrace) {
      /*
       * Push-Fehler dürfen den Login
       * nicht beeinträchtigen.
       */
      if (kDebugMode) {
        debugPrint(
          'PUSH: Initialisierung fehlgeschlagen: $error',
        );
        debugPrintStack(stackTrace: stackTrace);
      }
    } finally {
      /*
       * Nur der aktuell gültige Versuch
       * darf den Initialisierungsstatus freigeben.
       */
      if (pushRequestId == _pushRequestId &&
          _pushInitializingForUserId == userId) {
        _pushInitializingForUserId = null;
      }
    }
  }

  Future<void> _denyAndSignOut(
    String message,
    int requestId,
  ) async {
    _isDenyingAccess = true;
    _resetPushInitialization();

    try {
      await _authService.signOut().timeout(
        const Duration(seconds: 5),
      );
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
    _resetPushInitialization();

    setState(() {
      _status = _AuthGateStatus.signedOut;
      _deniedMessage = null;
    });
  }

  @override
  void dispose() {
    _requestId++;
    _resetPushInitialization();
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
