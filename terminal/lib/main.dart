import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/app.dart';
import 'core/constants/app_environment.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    AppEnvironment.validate();

    await Supabase.initialize(
      url: AppEnvironment.supabaseUrl,
      publishableKey: AppEnvironment.supabasePublishableKey,
    );

    runApp(const DiperaTerminalApp());
  } catch (error, stackTrace) {
    if (kDebugMode) {
      debugPrint('TERMINAL START ERROR: $error');
      debugPrintStack(stackTrace: stackTrace);
    }

    runApp(
      const MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(
          body: SafeArea(
            child: Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Dipera Terminal konnte nicht gestartet werden.\n\n'
                  'Bitte starte das Terminal erneut. '
                  'Falls das Problem bestehen bleibt, '
                  'wende dich an den Support.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.red,
                    fontSize: 15,
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