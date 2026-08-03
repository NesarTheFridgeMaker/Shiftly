import 'package:supabase_flutter/supabase_flutter.dart';

enum EmployeeStatus {
  checkedIn,
  checkedOut,
  onBreak,
  unknown,
}

EmployeeStatus parseEmployeeStatus(String? value) {
  switch (value) {
    case 'checked_in':
      return EmployeeStatus.checkedIn;

    case 'break':
      return EmployeeStatus.onBreak;

    case 'not_checked_in':
      return EmployeeStatus.checkedOut;

    default:
      return EmployeeStatus.unknown;
  }
}

class EmployeeBasicData {
  const EmployeeBasicData({
    required this.id,
    required this.name,
    required this.status,
    required this.businessId,
  });

  final String id;
  final String name;
  final EmployeeStatus status;
  final String? businessId;
}

class EmployeeService {
  EmployeeService(this._client);

  final SupabaseClient _client;

  Future<EmployeeBasicData> getCurrentEmployee() async {
    final user = _client.auth.currentUser;

    if (user == null) {
      throw const AuthException(
        'Keine aktive Sitzung gefunden.',
      );
    }

    final profile = await _client
        .from('profiles')
        .select('employee_id')
        .eq('id', user.id)
        .maybeSingle();

    if (profile == null) {
      throw StateError(
        'Für diesen Benutzer wurde kein Profil gefunden.',
      );
    }

    final employeeId = profile['employee_id'] as String?;

    if (employeeId == null || employeeId.isEmpty) {
      throw StateError(
        'Dieser Benutzer ist keinem Mitarbeiter zugeordnet.',
      );
    }

    final employee = await _client
        .from('employees')
        .select(
          'id, name, status, business_id',
        )
        .eq('id', employeeId)
        .maybeSingle();

    if (employee == null) {
      throw StateError(
        'Der zugehörige Mitarbeiter wurde nicht gefunden.',
      );
    }

    final name = employee['name'] as String?;

    if (name == null || name.trim().isEmpty) {
      throw StateError(
        'Für diesen Mitarbeiter wurde kein Name hinterlegt.',
      );
    }

    return EmployeeBasicData(
      id: employee['id'] as String,
      name: name.trim(),
      status: parseEmployeeStatus(
  employee['status'] as String?,
),
      businessId: employee['business_id'] as String?,
    );
  }
}