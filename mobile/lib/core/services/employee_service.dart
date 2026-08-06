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

    case 'on_break':
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

class EmployeeProfileData {
  const EmployeeProfileData({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.accountStatus,
    required this.status,
    required this.businessId,
    required this.businessName,
  });

  final String id;
  final String name;
  final String email;
  final String role;
  final String accountStatus;
  final EmployeeStatus status;
  final String? businessId;
  final String? businessName;

  String get roleLabel {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Administrator';

      case 'owner':
        return 'Inhaber';

      case 'employee':
        return 'Mitarbeiter';

      default:
        return role;
    }
  }

  String get accountStatusLabel {
    switch (accountStatus.toLowerCase()) {
      case 'active':
        return 'Aktiv';

      case 'inactive':
        return 'Inaktiv';

      default:
        return accountStatus;
    }
  }
}

class EmployeeService {
  EmployeeService(this._client);

  final SupabaseClient _client;

  Future<EmployeeBasicData> getCurrentEmployee() async {
    final profileData = await _getCurrentProfileAndEmployee();

    final employee = profileData.employee;
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

  Future<EmployeeProfileData> getCurrentEmployeeProfile() async {
    final user = _client.auth.currentUser;

    if (user == null) {
      throw const AuthException(
        'Keine aktive Sitzung gefunden.',
      );
    }

    final profileData = await _getCurrentProfileAndEmployee();

    final profile = profileData.profile;
    final employee = profileData.employee;

    final name = employee['name'] as String?;

    if (name == null || name.trim().isEmpty) {
      throw StateError(
        'Für diesen Mitarbeiter wurde kein Name hinterlegt.',
      );
    }

    final businessId =
        (employee['business_id'] as String?) ??
        (profile['business_id'] as String?);

    String? businessName;

    if (businessId != null && businessId.isNotEmpty) {
      final business = await _client
          .from('businesses')
          .select('name')
          .eq('id', businessId)
          .maybeSingle();

      final loadedBusinessName = business?['name'] as String?;

      if (loadedBusinessName != null &&
          loadedBusinessName.trim().isNotEmpty) {
        businessName = loadedBusinessName.trim();
      }
    }

    return EmployeeProfileData(
      id: employee['id'] as String,
      name: name.trim(),
      email: user.email?.trim() ?? '',
      role:
          (profile['role'] as String?) ??
          (employee['role'] as String?) ??
          'employee',
      accountStatus:
          (employee['account_status'] as String?) ??
          'unknown',
      status: parseEmployeeStatus(
        employee['status'] as String?,
      ),
      businessId: businessId,
      businessName: businessName,
    );
  }

  Future<_ProfileAndEmployeeData>
      _getCurrentProfileAndEmployee() async {
    final user = _client.auth.currentUser;

    if (user == null) {
      throw const AuthException(
        'Keine aktive Sitzung gefunden.',
      );
    }

    final profile = await _client
        .from('profiles')
        .select(
          'employee_id, business_id, role',
        )
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
          '''
          id,
          name,
          role,
          status,
          account_status,
          business_id
          ''',
        )
        .eq('id', employeeId)
        .maybeSingle();

    if (employee == null) {
      throw StateError(
        'Der zugehörige Mitarbeiter wurde nicht gefunden.',
      );
    }

    return _ProfileAndEmployeeData(
      profile: profile,
      employee: employee,
    );
  }
}

class _ProfileAndEmployeeData {
  const _ProfileAndEmployeeData({
    required this.profile,
    required this.employee,
  });

  final Map<String, dynamic> profile;
  final Map<String, dynamic> employee;
}