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

  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;

  Future<TerminalAdminProfile> signIn({
    required String email,
    required String password,
  }) async {
    final response = await _client.auth.signInWithPassword(
      email: email.trim(),
      password: password,
    );

    if (response.user == null || response.session == null) {
      throw const TerminalAuthException(
        'Die Anmeldung ist fehlgeschlagen.',
      );
    }

    try {
      return await loadCurrentAdminProfile();
    } on TerminalAuthException {
      await _client.auth.signOut();
      rethrow;
    }
  }

  Future<Session> ensureValidSession() async {
    final session = _client.auth.currentSession;

    if (session == null) {
      throw const TerminalSessionMissingException(
        'Keine gespeicherte Terminal-Anmeldung vorhanden.',
      );
    }

    if (!session.isExpired) {
      return session;
    }

    try {
      final response = await _client.auth.refreshSession();
      final refreshedSession = response.session;

      if (refreshedSession == null) {
        throw const TerminalSessionInvalidException(
          'Die Terminal-Anmeldung konnte nicht erneuert werden.',
        );
      }

      return refreshedSession;
    } on AuthException catch (error) {
      throw TerminalSessionRefreshException(
        'Die Terminal-Anmeldung konnte nicht erneuert werden: ${error.message}',
      );
    } catch (error) {
      throw TerminalTemporaryAuthException(
        'Die Verbindung zur Anmeldung konnte nicht hergestellt werden.',
        cause: error,
      );
    }
  }

  Future<TerminalAdminProfile> loadCurrentAdminProfile() async {
    await ensureValidSession();

    final user = _client.auth.currentUser;

    if (user == null) {
      throw const TerminalSessionMissingException(
        'Keine gültige Anmeldung vorhanden.',
      );
    }

    final profile = await _client
        .from('profiles')
        .select('id, role, business_id')
        .eq('id', user.id)
        .maybeSingle();

    if (profile == null) {
      throw const TerminalAuthException(
        'Dipera-Profil nicht gefunden.',
      );
    }

    final role =
        (profile['role'] as String?)?.trim().toLowerCase() ?? '';

    final businessId =
        (profile['business_id'] as String?)?.trim();

    if (role != 'admin' && role != 'owner') {
      throw const TerminalAuthException(
        'Das Terminal kann nur von Admins oder Ownern eingerichtet werden.',
      );
    }

    if (businessId == null || businessId.isEmpty) {
      throw const TerminalAuthException(
        'Dem Konto ist kein Betrieb zugeordnet.',
      );
    }

    final business = await _client
        .from('businesses')
        .select('id, name, status')
        .eq('id', businessId)
        .maybeSingle();

    if (business == null) {
      throw const TerminalAuthException(
        'Betrieb nicht gefunden.',
      );
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
      businessName:
          name == null || name.isEmpty
              ? 'Dipera Betrieb'
              : name,
    );
  }

  Future<void> refreshIfNeeded() async {
    await ensureValidSession();
  }

  Future<void> signOut() => _client.auth.signOut();
}

class TerminalAuthException implements Exception {
  const TerminalAuthException(this.message);

  final String message;

  @override
  String toString() => message;
}

class TerminalSessionMissingException extends TerminalAuthException {
  const TerminalSessionMissingException(super.message);
}

class TerminalSessionInvalidException extends TerminalAuthException {
  const TerminalSessionInvalidException(super.message);
}

class TerminalSessionRefreshException extends TerminalAuthException {
  const TerminalSessionRefreshException(super.message);
}

class TerminalTemporaryAuthException implements Exception {
  const TerminalTemporaryAuthException(
    this.message, {
    this.cause,
  });

  final String message;
  final Object? cause;

  @override
  String toString() => message;
}
