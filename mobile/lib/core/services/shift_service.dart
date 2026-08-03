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
        .select(
          'id, shift_date, start_time, end_time',
        )
        .eq('employee_id', employeeId)
        .eq('shift_date', today)
        .order('start_time', ascending: true);

    return (data as List<dynamic>).map((row) {
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