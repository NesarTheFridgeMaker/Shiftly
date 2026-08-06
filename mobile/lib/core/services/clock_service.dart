import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../constants/app_environment.dart';

enum ClockAction { checkIn, breakStart, breakEnd, checkOut }

enum ClockStatus { notCheckedIn, checkedIn, onBreak, unknown }

ClockStatus parseClockStatus(String? value) {
  switch (value) {
    case 'not_checked_in':
      return ClockStatus.notCheckedIn;

    case 'checked_in':
      return ClockStatus.checkedIn;

    case 'on_break':
      return ClockStatus.onBreak;

    default:
      return ClockStatus.unknown;
  }
}

String clockActionDatabaseValue(ClockAction action) {
  switch (action) {
    case ClockAction.checkIn:
      return 'check_in';

    case ClockAction.breakStart:
      return 'break_start';

    case ClockAction.breakEnd:
      return 'break_end';

    case ClockAction.checkOut:
      return 'check_out';
  }
}

String clockActionLabel(String action) {
  switch (action) {
    case 'check_in':
      return 'Eingestempelt';

    case 'break_start':
      return 'Pause gestartet';

    case 'break_end':
      return 'Pause beendet';

    case 'check_out':
      return 'Ausgestempelt';

    default:
      return action;
  }
}

class ClockEmployee {
  const ClockEmployee({
    required this.id,
    required this.name,
    required this.businessId,
    required this.businessName,
    required this.status,
    required this.locationTrackingMode,
  });

  final String id;
  final String name;
  final String businessId;
  final String businessName;
  final ClockStatus status;
  final String locationTrackingMode;

  ClockEmployee copyWith({ClockStatus? status}) {
    return ClockEmployee(
      id: id,
      name: name,
      businessId: businessId,
      businessName: businessName,
      status: status ?? this.status,
      locationTrackingMode: locationTrackingMode,
    );
  }
}

class ClockEntry {
  const ClockEntry({
    required this.id,
    required this.employeeId,
    required this.employeeName,
    required this.action,
    required this.createdAt,
  });

  final String id;
  final String employeeId;
  final String employeeName;
  final String action;
  final DateTime createdAt;
}

class ClockData {
  const ClockData({required this.employee, required this.entries});

  final ClockEmployee employee;
  final List<ClockEntry> entries;

  int get workedMinutes {
    final sortedEntries = [...entries]
      ..sort((first, second) => first.createdAt.compareTo(second.createdAt));

    var totalMinutes = 0;
    DateTime? workStart;

    for (final entry in sortedEntries) {
      if (entry.action == 'check_in') {
        workStart = entry.createdAt;
        continue;
      }

      if (entry.action == 'break_start') {
        if (workStart != null && entry.createdAt.isAfter(workStart)) {
          totalMinutes += entry.createdAt.difference(workStart).inMinutes;
        }

        workStart = null;
        continue;
      }

      if (entry.action == 'break_end') {
        workStart = entry.createdAt;
        continue;
      }

      if (entry.action == 'check_out') {
        if (workStart != null && entry.createdAt.isAfter(workStart)) {
          totalMinutes += entry.createdAt.difference(workStart).inMinutes;
        }

        workStart = null;
      }
    }

    return totalMinutes < 0 ? 0 : totalMinutes;
  }

  ClockEntry? get lastEntry {
    if (entries.isEmpty) {
      return null;
    }

    final sortedEntries = [...entries]
      ..sort((first, second) => first.createdAt.compareTo(second.createdAt));

    return sortedEntries.last;
  }
}

class ClockApiResult {
  const ClockApiResult({required this.entry, required this.status});

  final ClockEntry entry;
  final ClockStatus status;
}

class ClockService {
  ClockService(this._client);

  final SupabaseClient _client;

  Future<ClockData> loadClockData() async {
    final user = _client.auth.currentUser;

    if (user == null) {
      throw const AuthException('Keine aktive Sitzung gefunden.');
    }

    final profile = await _client
        .from('profiles')
        .select('employee_id, business_id, role')
        .eq('id', user.id)
        .maybeSingle();

    if (profile == null || profile['role'] != 'employee') {
      throw StateError('Es wurde kein gültiges Mitarbeiterprofil gefunden.');
    }

    final employeeId = profile['employee_id'] as String?;
    final businessId = profile['business_id'] as String?;

    if (employeeId == null ||
        employeeId.isEmpty ||
        businessId == null ||
        businessId.isEmpty) {
      throw StateError('Mitarbeiter oder Betrieb ist nicht zugeordnet.');
    }

    final employeeData = await _client
        .from('employees')
        .select('''
          id,
          name,
          status,
          business_id,
          location_tracking_mode
          ''')
        .eq('id', employeeId)
        .eq('business_id', businessId)
        .maybeSingle();

    if (employeeData == null) {
      throw StateError('Der Mitarbeiter wurde nicht gefunden.');
    }

    final businessData = await _client
        .from('businesses')
        .select('name')
        .eq('id', businessId)
        .maybeSingle();

    final employee = ClockEmployee(
      id: employeeId,
      name: (employeeData['name'] as String?)?.trim() ?? 'Mitarbeiter',
      businessId: businessId,
      businessName: (businessData?['name'] as String?)?.trim() ?? 'Betrieb',
      status: parseClockStatus(employeeData['status'] as String?),
      locationTrackingMode:
          (employeeData['location_tracking_mode'] as String?) ?? 'required',
    );

    final entries = await loadTodayEntries(
      employeeId: employeeId,
      businessId: businessId,
    );

    return ClockData(employee: employee, entries: entries);
  }

  Future<List<ClockEntry>> loadTodayEntries({
    required String employeeId,
    required String businessId,
  }) async {
    final now = DateTime.now();

    final dayStart = DateTime(now.year, now.month, now.day);

    final nextDayStart = dayStart.add(const Duration(days: 1));

    final data = await _client
        .from('time_entries')
        .select('''
          id,
          employee_id,
          employee_name,
          action,
          created_at
          ''')
        .eq('business_id', businessId)
        .eq('employee_id', employeeId)
        .gte('created_at', dayStart.toUtc().toIso8601String())
        .lt('created_at', nextDayStart.toUtc().toIso8601String())
        .order('created_at', ascending: true);

    return (data as List<dynamic>).map((row) {
      final map = row as Map<String, dynamic>;

      return ClockEntry(
        id: map['id'] as String,
        employeeId: map['employee_id'] as String,
        employeeName: (map['employee_name'] as String?) ?? '',
        action: map['action'] as String,
        createdAt: DateTime.parse(map['created_at'] as String).toLocal(),
      );
    }).toList();
  }

  Future<ClockApiResult> performClockAction({
    required ClockEmployee employee,
    required ClockAction action,
    double? latitude,
    double? longitude,
    double? accuracy,
    DateTime? capturedAt,
  }) async {
    final session = _client.auth.currentSession;

    if (session == null) {
      throw const AuthException('Deine Anmeldung ist abgelaufen.');
    }

    final baseUrl = AppEnvironment.apiBaseUrl.replaceAll(RegExp(r'/$'), '');

    final response = await http.post(
      Uri.parse('$baseUrl/api/time-entries/clock'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${session.accessToken}',
      },
      body: jsonEncode({
        'action': clockActionDatabaseValue(action),
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        if (accuracy != null) 'accuracy': accuracy,
        if (capturedAt != null)
          'capturedAt': capturedAt.toUtc().toIso8601String(),
      }),
    );

    final decoded = jsonDecode(response.body);

    if (decoded is! Map<String, dynamic>) {
      throw StateError('Die Serverantwort war ungültig.');
    }

    if (response.statusCode < 200 ||
        response.statusCode >= 300 ||
        decoded['success'] != true) {
      final error = decoded['error'];

      if (error is Map<String, dynamic>) {
        throw StateError(
          error['message'] as String? ??
              'Die Stempelung konnte nicht gespeichert werden.',
        );
      }

      throw StateError('Die Stempelung konnte nicht gespeichert werden.');
    }

    final entry = decoded['entry'] as Map<String, dynamic>;
    final employeeResult = decoded['employee'] as Map<String, dynamic>;

    return ClockApiResult(
      entry: ClockEntry(
        id:
            (entry['id'] as String?) ??
            'temporary-${DateTime.now().millisecondsSinceEpoch}',
        employeeId: employee.id,
        employeeName: employee.name,
        action: entry['action'] as String? ?? clockActionDatabaseValue(action),
        createdAt: DateTime.parse(entry['createdAt'] as String).toLocal(),
      ),
      status: parseClockStatus(employeeResult['status'] as String?),
    );
  }
}
