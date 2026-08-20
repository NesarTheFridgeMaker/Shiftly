import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/app.dart';
import 'core/constants/app_environment.dart';
import 'firebase_options.dart';
import 'package:flutter/foundation.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    debugPrint('START 1: Flutter initialisiert');

    debugPrint(
  'KEY PREFIX: ${AppEnvironment.supabasePublishableKey.substring(0, 15)}',
);
debugPrint(
  'KEY LENGTH: ${AppEnvironment.supabasePublishableKey.length}',
);
debugPrint(
  'SUPABASE URL: ${AppEnvironment.supabaseUrl}',
);

    AppEnvironment.validate();
    debugPrint('START 2: AppEnvironment gültig');

    debugPrint('START 3: Firebase wird initialisiert');

    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    ).timeout(const Duration(seconds: 15));

    debugPrint('START 4: Firebase erfolgreich initialisiert');

    debugPrint('START 5: Supabase wird initialisiert');

    await Supabase.initialize(
      url: AppEnvironment.supabaseUrl,
      publishableKey: AppEnvironment.supabasePublishableKey,
    ).timeout(const Duration(seconds: 15));

    debugPrint('START 6: Supabase erfolgreich initialisiert');

    runApp(const ProviderScope(child: DiperaApp()));

    debugPrint('START 7: runApp wurde ausgeführt');
  } catch (error, stackTrace) {
    debugPrint('APP-START FEHLGESCHLAGEN: $error');
    debugPrintStack(stackTrace: stackTrace);

    runApp(
      MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(
          backgroundColor: Colors.white,
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: SingleChildScrollView(
                  child: SelectableText(
                    'Dipera konnte nicht gestartet werden.\n\n'
                    'Fehler:\n$error\n\n'
                    'Stacktrace:\n$stackTrace',
                    style: const TextStyle(fontSize: 14, color: Colors.red),
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
