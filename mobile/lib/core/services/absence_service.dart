import 'package:supabase_flutter/supabase_flutter.dart';

enum AbsenceStatus { pending, approved, rejected, unknown }

AbsenceStatus parseAbsenceStatus(String? value) {
  switch (value?.toLowerCase()) {
    case 'pending':
    case 'requested':
      return AbsenceStatus.pending;

    case 'approved':
      return AbsenceStatus.approved;

    case 'rejected':
    case 'declined':
      return AbsenceStatus.rejected;

    default:
      return AbsenceStatus.unknown;
  }
}

class EmployeeAbsence {
  const EmployeeAbsence({
    required this.id,
    required this.employeeId,
    required this.employeeName,
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.note,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String employeeId;
  final String employeeName;
  final String type;
  final DateTime startDate;
  final DateTime endDate;
  final String? note;
  final AbsenceStatus status;
  final DateTime createdAt;

  String get typeLabel {
    switch (type.toLowerCase()) {
      case 'vacation':
      case 'urlaub':
        return 'Urlaub';

      case 'sick':
      case 'sickness':
      case 'krankheit':
        return 'Krankheit';

      case 'special_leave':
      case 'sonderurlaub':
        return 'Sonderurlaub';

      case 'parental_leave':
      case 'elternzeit':
        return 'Elternzeit';

      case 'training':
      case 'fortbildung':
        return 'Fortbildung';

      case 'unpaid_leave':
      case 'unbezahlter_urlaub':
        return 'Unbezahlter Urlaub';

      default:
        return type.trim().isEmpty ? 'Sonstiges' : type;
    }
  }

  String get statusLabel {
    switch (status) {
      case AbsenceStatus.pending:
        return 'Ausstehend';

      case AbsenceStatus.approved:
        return 'Genehmigt';

      case AbsenceStatus.rejected:
        return 'Abgelehnt';

      case AbsenceStatus.unknown:
        return 'Unbekannt';
    }
  }
}

class VacationBalance {
  const VacationBalance({
    required this.employeeId,
    required this.vacationYear,
    required this.annualEntitlementDays,
    required this.approvedVacationDays,
    required this.pendingVacationDays,
    required this.availableVacationDays,
  });

  final String employeeId;
  final int vacationYear;
  final int annualEntitlementDays;
  final int approvedVacationDays;
  final int pendingVacationDays;
  final int availableVacationDays;

  factory VacationBalance.fromJson(Map<String, dynamic> json) {
    return VacationBalance(
      employeeId: json['employee_id'] as String,
      vacationYear: (json['vacation_year'] as num).toInt(),
      annualEntitlementDays:
          (json['annual_entitlement_days'] as num).toInt(),
      approvedVacationDays:
          (json['approved_vacation_days'] as num).toInt(),
      pendingVacationDays:
          (json['pending_vacation_days'] as num).toInt(),
      availableVacationDays:
          (json['available_vacation_days'] as num).toInt(),
    );
  }
}

class AbsenceService {
  AbsenceService(this._client);

  final SupabaseClient _client;

  Future<VacationBalance> getCurrentVacationBalance() async {
    final data = await _client.rpc(
      'get_my_current_vacation_balance',
    );

    if (data is! List || data.isEmpty) {
      throw Exception(
        'Für das aktuelle Urlaubskonto wurden keine Daten gefunden.',
      );
    }

    final row = Map<String, dynamic>.from(
      data.first as Map,
    );

    return VacationBalance.fromJson(row);
  }

  Future<String> createVacationRequest({
    required DateTime startDate,
    required DateTime endDate,
    String? note,
  }) async {
    final normalizedStart = DateTime(
      startDate.year,
      startDate.month,
      startDate.day,
    );

    final normalizedEnd = DateTime(
      endDate.year,
      endDate.month,
      endDate.day,
    );

    if (normalizedEnd.isBefore(normalizedStart)) {
      throw ArgumentError(
        'Das Enddatum darf nicht vor dem Startdatum liegen.',
      );
    }

    final data = await _client.rpc(
      'create_own_absence_request',
      params: {
        'p_type_code': 'vacation',
        'p_start_date': _formatDateForDatabase(
          normalizedStart,
        ),
        'p_end_date': _formatDateForDatabase(
          normalizedEnd,
        ),
        'p_note': _normalizeNote(note),
      },
    );

    if (data is! String || data.isEmpty) {
      throw Exception(
        'Der Urlaubsantrag konnte nicht gespeichert werden.',
      );
    }

    return data;
  }

  Future<List<EmployeeAbsence>> getEmployeeAbsences({
    required String employeeId,
  }) async {
    final data = await _client
        .from('absences')
        .select('''
          id,
          employee_id,
          employee_name,
          type,
          start_date,
          end_date,
          note,
          request_status,
          created_at
          ''')
        .eq('employee_id', employeeId)
        .eq('hidden_by_employee', false)
        .order('start_date', ascending: false)
        .order('created_at', ascending: false);

    return (data as List<dynamic>).map((row) {
      final map = row as Map<String, dynamic>;

      return EmployeeAbsence(
        id: map['id'] as String,
        employeeId: map['employee_id'] as String,
        employeeName:
            (map['employee_name'] as String?)?.trim() ?? '',
        type:
            (map['type'] as String?)?.trim() ?? 'other',
        startDate: DateTime.parse(
          map['start_date'] as String,
        ),
        endDate: DateTime.parse(
          map['end_date'] as String,
        ),
        note: (map['note'] as String?)?.trim(),
        status: parseAbsenceStatus(
          map['request_status'] as String?,
        ),
        createdAt: DateTime.parse(
          map['created_at'] as String,
        ),
      );
    }).toList();
  }

  String _formatDateForDatabase(DateTime date) {
    final year = date.year.toString().padLeft(4, '0');
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');

    return '$year-$month-$day';
  }

  String? _normalizeNote(String? value) {
    final trimmed = value?.trim();

    if (trimmed == null || trimmed.isEmpty) {
      return null;
    }

    return trimmed;
  }
}
