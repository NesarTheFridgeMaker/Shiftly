import 'package:supabase_flutter/supabase_flutter.dart';

class EmployeeAccessResult {
  const EmployeeAccessResult({
    required this.isAllowed,
    this.employeeId,
    this.businessId,
    this.role,
    this.errorMessage,
  });

  final bool isAllowed;
  final String? employeeId;
  final String? businessId;
  final String? role;
  final String? errorMessage;
}

class AuthService {
  AuthService(this._client);

  final SupabaseClient _client;

  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    await _client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  Future<EmployeeAccessResult> checkEmployeeAccess() async {
    final user = _client.auth.currentUser;

    if (user == null) {
      return const EmployeeAccessResult(
        isAllowed: false,
        errorMessage: 'Keine aktive Sitzung gefunden.',
      );
    }

    try {
      final profile = await _client
          .from('profiles')
          .select(
            'role, employee_id, business_id',
          )
          .eq('id', user.id)
          .maybeSingle();

      if (profile == null) {
        return const EmployeeAccessResult(
          isAllowed: false,
          errorMessage:
              'Für diesen Zugang wurde kein Profil gefunden.',
        );
      }

      final role = profile['role'] as String?;
      final employeeId = profile['employee_id'] as String?;
      final businessId = profile['business_id'] as String?;

      if (role != 'employee') {
        return EmployeeAccessResult(
          isAllowed: false,
          role: role,
          errorMessage:
              'Diese App ist ausschließlich für Mitarbeiterkonten vorgesehen.',
        );
      }

      if (employeeId == null || employeeId.isEmpty) {
        return const EmployeeAccessResult(
          isAllowed: false,
          role: 'employee',
          errorMessage:
              'Dieser Zugang ist keinem Mitarbeiter zugeordnet.',
        );
      }

      final employee = await _client
          .from('employees')
          .select(
            'id, status, account_status, business_id',
          )
          .eq('id', employeeId)
          .maybeSingle();

      if (employee == null) {
        return const EmployeeAccessResult(
          isAllowed: false,
          role: 'employee',
          errorMessage:
              'Der zugehörige Mitarbeiter wurde nicht gefunden.',
        );
      }

      final accountStatus = employee['account_status'] as String?;

if (accountStatus != 'active') {
  return EmployeeAccessResult(
    isAllowed: false,
    employeeId: employeeId,
    businessId: businessId,
    role: role,
    errorMessage:
        'Der Zugang dieses Mitarbeiterkontos ist derzeit nicht aktiv.',
  );
}

      return EmployeeAccessResult(
        isAllowed: true,
        employeeId: employeeId,
        businessId:
            (employee['business_id'] as String?) ?? businessId,
        role: role,
      );
    } on PostgrestException catch (error) {
      return EmployeeAccessResult(
        isAllowed: false,
        errorMessage:
            'Der Mitarbeiterzugang konnte nicht geprüft werden: ${error.message}',
      );
    } catch (_) {
      return const EmployeeAccessResult(
        isAllowed: false,
        errorMessage:
            'Der Mitarbeiterzugang konnte nicht geprüft werden.',
      );
    }
  }

  User? get currentUser => _client.auth.currentUser;

  Session? get currentSession => _client.auth.currentSession;
}