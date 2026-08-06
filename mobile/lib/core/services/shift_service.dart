import 'package:supabase_flutter/supabase_flutter.dart';

class EmployeeShift {
  const EmployeeShift({
    required this.id,
    required this.employeeId,
    required this.employeeName,
    required this.date,
    required this.startTime,
    required this.endTime,
    this.workTypeName,
  });

  final String id;
  final String employeeId;
  final String employeeName;
  final DateTime date;
  final String startTime;
  final String endTime;
  final String? workTypeName;

  String get formattedTime {
    return '${_formatDatabaseTime(startTime)} – '
        '${_formatDatabaseTime(endTime)} Uhr';
  }

  DateTime get startsAt {
    final parts = startTime.split(':');

    final hour = parts.isNotEmpty ? int.tryParse(parts[0]) ?? 0 : 0;

    final minute = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;

    final second = parts.length > 2 ? int.tryParse(parts[2]) ?? 0 : 0;

    return DateTime(date.year, date.month, date.day, hour, minute, second);
  }

  static String _formatDatabaseTime(String value) {
    final parts = value.split(':');

    if (parts.length < 2) {
      return value;
    }

    return '${parts[0].padLeft(2, '0')}:'
        '${parts[1].padLeft(2, '0')}';
  }
}

class ShiftService {
  ShiftService(this._client);

  final SupabaseClient _client;

  Future<List<EmployeeShift>> getTodayShifts({
    required String employeeId,
  }) async {
    final today = _formatDateForDatabase(DateTime.now());

    final data = await _client
        .from('shifts')
        .select('''
          id,
          employee_id,
          employee_name,
          shift_date,
          start_time,
          end_time,
          work_type_name
          ''')
        .eq('employee_id', employeeId)
        .eq('shift_date', today)
        .eq('is_published', true)
        .order('start_time', ascending: true);

    return _mapShifts(data);
  }

  Future<EmployeeShift?> getNextShift({required String employeeId}) async {
    final now = DateTime.now();
    final today = _formatDateForDatabase(now);

    final data = await _client
        .from('shifts')
        .select('''
          id,
          employee_id,
          employee_name,
          shift_date,
          start_time,
          end_time,
          work_type_name
          ''')
        .eq('employee_id', employeeId)
        .gte('shift_date', today)
        .eq('is_published', true)
        .order('shift_date', ascending: true)
        .order('start_time', ascending: true)
        .limit(50);

    final shifts = _mapShifts(data);

    for (final shift in shifts) {
      if (shift.startsAt.isAfter(now)) {
        return shift;
      }
    }

    return null;
  }

  Future<List<EmployeeShift>> getMonthShifts({
    required String employeeId,
    required int year,
    required int month,
  }) async {
    final monthStart = DateTime(year, month, 1);
    final nextMonthStart = DateTime(year, month + 1, 1);

    final data = await _client
        .from('shifts')
        .select('''
          id,
          employee_id,
          employee_name,
          shift_date,
          start_time,
          end_time,
          work_type_name
          ''')
        .eq('employee_id', employeeId)
        .gte('shift_date', _formatDateForDatabase(monthStart))
        .lt('shift_date', _formatDateForDatabase(nextMonthStart))
        .eq('is_published', true)
        .order('shift_date', ascending: true)
        .order('start_time', ascending: true);

    return _mapShifts(data);
  }

  Future<List<EmployeeShift>> getTeamMonthShifts({
    required String businessId,
    required int year,
    required int month,
  }) async {
    final monthStart = DateTime(year, month, 1);
    final nextMonthStart = DateTime(year, month + 1, 1);

    final data = await _client
        .from('shifts')
        .select('''
          id,
          employee_id,
          employee_name,
          shift_date,
          start_time,
          end_time,
          work_type_name
          ''')
        .eq('business_id', businessId)
        .gte('shift_date', _formatDateForDatabase(monthStart))
        .lt('shift_date', _formatDateForDatabase(nextMonthStart))
        .eq('is_published', true)
        .order('shift_date', ascending: true)
        .order('start_time', ascending: true)
        .order('employee_name', ascending: true);

    return _mapShifts(data);
  }

  List<EmployeeShift> _mapShifts(List<dynamic> data) {
    return data.map((row) {
      final map = row as Map<String, dynamic>;

      return EmployeeShift(
        id: map['id'] as String,
        employeeId: map['employee_id'] as String,
        employeeName:
            (map['employee_name'] as String?)?.trim().isNotEmpty == true
            ? (map['employee_name'] as String).trim()
            : 'Mitarbeiter',
        date: DateTime.parse(map['shift_date'] as String),
        startTime: map['start_time'] as String,
        endTime: map['end_time'] as String,
        workTypeName: map['work_type_name'] as String?,
      );
    }).toList();
  }

  String _formatDateForDatabase(DateTime date) {
    final year = date.year.toString().padLeft(4, '0');
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');

    return '$year-$month-$day';
  }
}
