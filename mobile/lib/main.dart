import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/app.dart';
import 'core/constants/app_environment.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    debugPrint('START 1: Flutter initialisiert');

    AppEnvironment.validate();
    debugPrint('START 2: AppEnvironment gültig');

    debugPrint('START 3: Supabase wird initialisiert');

    await Supabase.initialize(
      url: AppEnvironment.supabaseUrl,
      publishableKey: AppEnvironment.supabasePublishableKey,
    ).timeout(
      const Duration(seconds: 15),
    );

    debugPrint('START 4: Supabase erfolgreich initialisiert');

    runApp(
      const ProviderScope(
        child: DiperaApp(),
      ),
    );

    debugPrint('START 5: runApp wurde ausgeführt');
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
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.red,
                    ),
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