import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../navigation/pages/main_shell.dart';
import 'login_page.dart';
import 'splash_page.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  late final StreamSubscription<AuthState> _authSubscription;

  Session? _session;
  bool _isCheckingSession = true;

  @override
  void initState() {
    super.initState();

    _session = Supabase.instance.client.auth.currentSession;

    _authSubscription =
        Supabase.instance.client.auth.onAuthStateChange.listen(
      (authState) {
        if (!mounted) {
          return;
        }

        setState(() {
          _session = authState.session;
          _isCheckingSession = false;
        });
      },
      onError: (Object error, StackTrace stackTrace) {
        if (!mounted) {
          return;
        }

        setState(() {
          _session = Supabase.instance.client.auth.currentSession;
          _isCheckingSession = false;
        });
      },
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isCheckingSession = false;
      });
    });
  }

  @override
  void dispose() {
    _authSubscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isCheckingSession) {
      return const SplashPage();
    }

    if (_session != null) {
      return const MainShell();
    }

    return const LoginPage();
  }
}