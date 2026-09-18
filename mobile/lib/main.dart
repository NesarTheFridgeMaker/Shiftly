import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/app.dart';
import 'core/constants/app_environment.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    if (kDebugMode) {
      debugPrint('START 1: Flutter initialisiert');
    }

    AppEnvironment.validate();

    if (kDebugMode) {
      debugPrint('START 2: AppEnvironment gültig');
      debugPrint('START 3: Firebase wird initialisiert');
    }

    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    ).timeout(const Duration(seconds: 15));

    if (kDebugMode) {
      debugPrint('START 4: Firebase erfolgreich initialisiert');
      debugPrint('START 5: Supabase wird initialisiert');
    }

    await Supabase.initialize(
      url: AppEnvironment.supabaseUrl,
      publishableKey: AppEnvironment.supabasePublishableKey,
    ).timeout(const Duration(seconds: 15));

    if (kDebugMode) {
      debugPrint('START 6: Supabase erfolgreich initialisiert');
    }

    runApp(const ProviderScope(child: DiperaApp()));

    if (kDebugMode) {
      debugPrint('START 7: runApp wurde ausgeführt');
    }
  } catch (error, stackTrace) {
    if (kDebugMode) {
      debugPrint('APP-START FEHLGESCHLAGEN: $error');
      debugPrintStack(stackTrace: stackTrace);
    }

    runApp(
      const MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(
          backgroundColor: Colors.white,
          body: SafeArea(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Center(
                child: Text(
                  'Dipera konnte nicht gestartet werden.\n\n'
                  'Bitte starte die App erneut. '
                  'Falls das Problem bestehen bleibt, '
                  'wende dich an den Support.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}