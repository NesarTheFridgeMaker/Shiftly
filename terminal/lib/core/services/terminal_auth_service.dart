import 'package:supabase_flutter/supabase_flutter.dart';

class TerminalAdminProfile {
  const TerminalAdminProfile({
    required this.userId,
    required this.role,
    required this.businessId,
    required this.businessName,
  });
  final String userId;
  final String role;
  final String businessId;
  final String businessName;
}

class TerminalAuthService {
  TerminalAuthService(this._client);
  final SupabaseClient _client;

  Session? get currentSession => _client.auth.currentSession;

  Future<TerminalAdminProfile> signIn({
    required String email,
    required String password,
  }) async {
    final response = await _client.auth.signInWithPassword(
      email: email.trim(),
      password: password,
    );
    if (response.user == null) {
      throw const TerminalAuthException('Die Anmeldung ist fehlgeschlagen.');
    }
    try {
      return await loadCurrentAdminProfile();
    } catch (_) {
      await _client.auth.signOut();
      rethrow;
    }
  }

  Future<TerminalAdminProfile> loadCurrentAdminProfile() async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const TerminalAuthException('Keine gültige Anmeldung vorhanden.');
    }

    final profile = await _client
        .from('profiles')
        .select('id, role, business_id')
        .eq('id', user.id)
        .maybeSingle();

    if (profile == null) {
      throw const TerminalAuthException('Dipera-Profil nicht gefunden.');
    }

    final role =
    (profile['role'] as String?)?.trim().toLowerCase() ?? '';
    final businessId = (profile['business_id'] as String?)?.trim();

    if (role != 'admin' && role != 'owner') {
      throw const TerminalAuthException(
        'Das Terminal kann nur von Admins oder Ownern eingerichtet werden.',
      );
    }
    if (businessId == null || businessId.isEmpty) {
      throw const TerminalAuthException('Dem Konto ist kein Betrieb zugeordnet.');
    }

    final business = await _client
        .from('businesses')
        .select('id, name, status')
        .eq('id', businessId)
        .maybeSingle();

    if (business == null) {
      throw const TerminalAuthException('Betrieb nicht gefunden.');
    }
    if ((business['status'] as String?)?.toLowerCase() == 'suspended') {
      throw const TerminalAuthException(
        'Die Zeiterfassung dieses Betriebs ist momentan gesperrt.',
      );
    }

    final name = (business['name'] as String?)?.trim();
    return TerminalAdminProfile(
      userId: user.id,
      role: role,
      businessId: businessId,
      businessName: name == null || name.isEmpty ? 'Dipera Betrieb' : name,
    );
  }

  Future<void> signOut() => _client.auth.signOut();
}

class TerminalAuthException implements Exception {
  const TerminalAuthException(this.message);
  final String message;
  @override
  String toString() => message;
}
