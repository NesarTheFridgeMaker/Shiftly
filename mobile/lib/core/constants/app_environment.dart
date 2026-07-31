class AppEnvironment {
  const AppEnvironment._();

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
  );

  static const String supabasePublishableKey = String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
  );

  static void validate() {
    if (supabaseUrl.isEmpty) {
      throw StateError(
        'SUPABASE_URL fehlt. Starte die App mit '
        '--dart-define=SUPABASE_URL=...',
      );
    }

    if (supabasePublishableKey.isEmpty) {
      throw StateError(
        'SUPABASE_PUBLISHABLE_KEY fehlt. Starte die App mit '
        '--dart-define=SUPABASE_PUBLISHABLE_KEY=...',
      );
    }
  }
}