import 'package:supabase_flutter/supabase_flutter.dart';

class EmployeeShift {
  const EmployeeShift({
    required this.id,
    required this.date,
    required this.startTime,
    required this.endTime,
  });

  final String id;
  final DateTime date;
  final String startTime;
  final String endTime;

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
        .select('id, shift_date, start_time, end_time')
        .eq('employee_id', employeeId)
        .eq('shift_date', today)
        .order('start_time', ascending: true);

    return _mapShifts(data);
  }

  Future<EmployeeShift?> getNextShift({required String employeeId}) async {
    final now = DateTime.now();
    final today = _formatDateForDatabase(now);

    final data = await _client
        .from('shifts')
        .select('id, shift_date, start_time, end_time')
        .eq('employee_id', employeeId)
        .gte('shift_date', today)
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

  List<EmployeeShift> _mapShifts(List<dynamic> data) {
    return data.map((row) {
      final map = row as Map<String, dynamic>;

      return EmployeeShift(
        id: map['id'] as String,
        date: DateTime.parse(map['shift_date'] as String),
        startTime: map['start_time'] as String,
        endTime: map['end_time'] as String,
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
