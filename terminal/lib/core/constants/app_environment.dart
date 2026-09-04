class AppEnvironment {
  const AppEnvironment._();

  static const String supabaseUrl =
      String.fromEnvironment('SUPABASE_URL');
  static const String supabasePublishableKey =
      String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');
  static const String apiBaseUrl =
      String.fromEnvironment('API_BASE_URL');

  static void validate() {
    if (supabaseUrl.isEmpty) {
      throw StateError('SUPABASE_URL fehlt.');
    }
    if (supabasePublishableKey.isEmpty) {
      throw StateError('SUPABASE_PUBLISHABLE_KEY fehlt.');
    }
    if (apiBaseUrl.isEmpty) {
      throw StateError('API_BASE_URL fehlt.');
    }
    final uri = Uri.tryParse(apiBaseUrl);
    if (uri == null || !uri.hasScheme || !uri.hasAuthority) {
      throw StateError('API_BASE_URL ist ungültig.');
    }
  }
}
