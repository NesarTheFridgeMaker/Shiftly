import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/services/terminal_auth_service.dart';
import '../features/auth/pages/terminal_login_page.dart';
import '../features/terminal/pages/terminal_dashboard_page.dart';
import '../shared/theme/app_colors.dart';
import '../shared/theme/app_theme.dart';

class DiperaTerminalApp extends StatefulWidget {
  const DiperaTerminalApp({super.key});

  @override
  State<DiperaTerminalApp> createState() => _DiperaTerminalAppState();
}

class _DiperaTerminalAppState extends State<DiperaTerminalApp>
    with WidgetsBindingObserver {
  late final TerminalAuthService _auth;
  StreamSubscription<AuthState>? _authSubscription;

  TerminalAdminProfile? _profile;
  Object? _error;

  bool _loading = true;
  bool _hasStoredSession = false;
  bool _reconnecting = false;

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addObserver(this);

    _auth = TerminalAuthService(Supabase.instance.client);
    _hasStoredSession = _auth.currentSession != null;

    _listenToAuthChanges();
    _restore();
  }

  void _listenToAuthChanges() {
    _authSubscription = _auth.authStateChanges.listen(
      (data) {
        if (!mounted) return;

        switch (data.event) {
          case AuthChangeEvent.signedOut:
          case AuthChangeEvent.userDeleted:
            setState(() {
              _profile = null;
              _error = null;
              _loading = false;
              _hasStoredSession = false;
              _reconnecting = false;
            });
            break;

          case AuthChangeEvent.signedIn:
          case AuthChangeEvent.tokenRefreshed:
          case AuthChangeEvent.initialSession:
          case AuthChangeEvent.userUpdated:
            _hasStoredSession = data.session != null;

            if (_profile == null && data.session != null) {
              unawaited(_restore());
            }
            break;

          default:
            break;
        }
      },
      onError: (Object error, StackTrace stackTrace) {
        if (kDebugMode) {
          debugPrint('TERMINAL AUTH STREAM ERROR: $error');
          debugPrintStack(stackTrace: stackTrace);
        }
      },
    );
  }

  Future<void> _restore() async {
    final existingSession = _auth.currentSession;

    if (existingSession == null) {
      if (!mounted) return;

      setState(() {
        _loading = false;
        _hasStoredSession = false;
        _reconnecting = false;
      });

      return;
    }

    if (mounted) {
      setState(() {
        _hasStoredSession = true;
        _reconnecting = true;
        _error = null;
      });
    }

    try {
      final profile = await _auth.loadCurrentAdminProfile();

      if (!mounted) return;

      setState(() {
        _profile = profile;
        _error = null;
        _loading = false;
        _reconnecting = false;
        _hasStoredSession = true;
      });
    } on TerminalTemporaryAuthException catch (error) {
      if (!mounted) return;

      setState(() {
        _error = error;
        _loading = false;
        _reconnecting = false;
        _hasStoredSession = true;
      });
    } on TerminalAuthException catch (error) {
      if (!mounted) return;

      setState(() {
        _error = error;
        _loading = false;
        _reconnecting = false;
        _hasStoredSession = true;
      });
    } catch (error, stackTrace) {
      if (kDebugMode) {
        debugPrint('TERMINAL RESTORE ERROR: $error');
        debugPrintStack(stackTrace: stackTrace);
      }

      if (!mounted) return;

      setState(() {
        _error = error;
        _loading = false;
        _reconnecting = false;
        _hasStoredSession = true;
      });
    }
  }

  Future<void> _retryRestore() async {
    if (_reconnecting) return;

    setState(() {
      _reconnecting = true;
      _error = null;
    });

    await _restore();
  }

  Future<void> _logout() async {
    await _auth.signOut();

    if (!mounted) return;

    setState(() {
      _profile = null;
      _error = null;
      _hasStoredSession = false;
      _reconnecting = false;
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);

    if (state == AppLifecycleState.resumed &&
        _auth.currentSession != null) {
      unawaited(_refreshAfterResume());
    }
  }

  Future<void> _refreshAfterResume() async {
    try {
      await _auth.refreshIfNeeded();

      if (_profile == null) {
        await _restore();
      }
    } on TerminalTemporaryAuthException catch (error) {
      if (kDebugMode) {
        debugPrint(
          'TERMINAL RESUME AUTH TEMPORARY ERROR: $error',
        );
      }
    } on TerminalAuthException catch (error) {
      if (kDebugMode) {
        debugPrint(
          'TERMINAL RESUME AUTH ERROR: $error',
        );
      }
    } catch (error, stackTrace) {
      if (kDebugMode) {
        debugPrint(
          'TERMINAL RESUME AUTH UNKNOWN ERROR: $error',
        );
        debugPrintStack(stackTrace: stackTrace);
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _authSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: AppColors.background,
        statusBarIconBrightness: Brightness.dark,
        systemNavigationBarColor: AppColors.surface,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: MaterialApp(
        title: 'Dipera Terminal',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        home: _loading
            ? const Scaffold(
                body: Center(
                  child: CircularProgressIndicator(),
                ),
              )
            : _profile != null
                ? TerminalDashboardPage(
                    profile: _profile!,
                    onLogout: _logout,
                  )
                : _hasStoredSession
                    ? _TerminalReconnectPage(
                        loading: _reconnecting,
                        onRetry: _retryRestore,
                        onLogout: _logout,
                      )
                    : TerminalLoginPage(
                        authService: _auth,
                        startupError: _error,
                        onLoggedIn: (profile) async {
                          if (!mounted) return;

                          setState(() {
                            _profile = profile;
                            _error = null;
                            _hasStoredSession = true;
                          });
                        },
                      ),
      ),
    );
  }
}

class _TerminalReconnectPage extends StatelessWidget {
  const _TerminalReconnectPage({
    required this.loading,
    required this.onRetry,
    required this.onLogout,
  });

  final bool loading;
  final Future<void> Function() onRetry;
  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (loading)
                        const CircularProgressIndicator()
                      else
                        const Icon(
                          Icons.cloud_off_rounded,
                          size: 48,
                        ),
                      const SizedBox(height: 20),
                      Text(
                        loading
                            ? 'Terminal wird verbunden …'
                            : 'Verbindung zum Terminal wird wiederhergestellt',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        loading
                            ? 'Die gespeicherte Anmeldung wird geprüft.'
                            : 'Die Terminal-Anmeldung wurde nicht gelöscht. '
                                'Prüfe die Internetverbindung und versuche es erneut.',
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed:
                              loading ? null : () => onRetry(),
                          child: const Text(
                            'Erneut verbinden',
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed:
                            loading ? null : () => onLogout(),
                        child: const Text(
                          'Terminal abmelden',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}