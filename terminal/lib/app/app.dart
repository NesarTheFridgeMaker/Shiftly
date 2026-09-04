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

class _DiperaTerminalAppState extends State<DiperaTerminalApp> {
  late final TerminalAuthService _auth;
  TerminalAdminProfile? _profile;
  Object? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _auth = TerminalAuthService(Supabase.instance.client);
    _restore();
  }

  Future<void> _restore() async {
    if (_auth.currentSession == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }

    try {
      final profile = await _auth.loadCurrentAdminProfile();
      if (mounted) {
        setState(() {
          _profile = profile;
          _loading = false;
        });
      }
    } catch (error) {
      await _auth.signOut();
      if (mounted) {
        setState(() {
          _error = error;
          _loading = false;
        });
      }
    }
  }

  Future<void> _logout() async {
    await _auth.signOut();
    if (mounted) setState(() => _profile = null);
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
                body: Center(child: CircularProgressIndicator()),
              )
            : _profile == null
                ? TerminalLoginPage(
                    authService: _auth,
                    startupError: _error,
                    onLoggedIn: (profile) async {
                      setState(() {
                        _profile = profile;
                        _error = null;
                      });
                    },
                  )
                : TerminalDashboardPage(
                    profile: _profile!,
                    onLogout: _logout,
                  ),
      ),
    );
  }
}
