class AppEnvironment {
  const AppEnvironment._();

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
  );

  static const String supabasePublishableKey =
      String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
  );

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
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

    if (apiBaseUrl.isEmpty) {
      throw StateError(
        'API_BASE_URL fehlt. Starte die App mit '
        '--dart-define=API_BASE_URL=https://deine-domain.de',
      );
    }

    final uri = Uri.tryParse(apiBaseUrl);

    if (uri == null ||
        !uri.hasScheme ||
        !uri.hasAuthority) {
      throw StateError(
        'API_BASE_URL ist ungültig. Verwende eine vollständige URL '
        'wie https://deine-domain.de.',
      );
    }
  }
}