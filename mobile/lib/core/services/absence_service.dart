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

class AbsenceService {
  AbsenceService(this._client);

  final SupabaseClient _client;

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
        employeeName: (map['employee_name'] as String?)?.trim() ?? '',
        type: (map['type'] as String?)?.trim() ?? 'other',
        startDate: DateTime.parse(map['start_date'] as String),
        endDate: DateTime.parse(map['end_date'] as String),
        note: (map['note'] as String?)?.trim(),
        status: parseAbsenceStatus(map['request_status'] as String?),
        createdAt: DateTime.parse(map['created_at'] as String),
      );
    }).toList();
  }
}
