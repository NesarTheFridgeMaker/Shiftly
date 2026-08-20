import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../constants/app_environment.dart';
import 'package:flutter/foundation.dart';

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
    this.localCreatedAt,
  });

  final String id;
  final String employeeId;
  final String employeeName;
  final String action;

  /// Absoluter Zeitpunkt für Datenlogik/Audit.
  final DateTime createdAt;

  /// Bereits serverseitig in die Betriebszeitzone umgerechnete Wandzeit.
  ///
  /// Beispiel:
  /// 2026-08-16T10:07:00.273
  ///
  /// Darf nicht mit toLocal() oder toUtc() umgerechnet werden.
  final String? localCreatedAt;
}

class ClockData {
  const ClockData({
    required this.employee,
    required this.entries,
    required this.workedMinutes,
    required this.lastEntry,
    required this.businessTimezone,
    required this.localDate,
    required this.businessLocalNow,
  });

  final ClockEmployee employee;
  final List<ClockEntry> entries;
  final int workedMinutes;
  final ClockEntry? lastEntry;

  /// IANA-Zeitzone des Betriebs, z. B. Europe/Berlin.
  final String businessTimezone;

  /// Lokales Kalenderdatum des Betriebs.
  final String localDate;

  /// Aktuelle Betriebs-Wandzeit beim RPC-Load.
  ///
  /// Beispiel:
  /// 2026-08-16T12:10:22.806
  ///
  /// Bewusst als String, damit keine Gerätezeitzonen-Konvertierung erfolgt.
  final String businessLocalNow;
}

class ClockApiResult {
  const ClockApiResult({
    required this.entry,
    required this.status,
  });

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
      throw StateError(
        'Es wurde kein gültiges Mitarbeiterprofil gefunden.',
      );
    }

    final employeeId = profile['employee_id'] as String?;
    final businessId = profile['business_id'] as String?;

    if (employeeId == null ||
        employeeId.isEmpty ||
        businessId == null ||
        businessId.isEmpty) {
      throw StateError(
        'Mitarbeiter oder Betrieb ist nicht zugeordnet.',
      );
    }

    final employeeData = await _client
        .from('employees')
        .select('id, name, business_id, location_tracking_mode')
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

    final todayClockRaw =
        await _client.rpc('get_my_today_clock_data');
        debugPrint(
  'FLUTTER WORKED MINUTES RPC: ${todayClockRaw['worked_minutes']}',
);

    if (todayClockRaw is! Map<String, dynamic>) {
      throw StateError(
        'Die heutigen Zeiterfassungsdaten sind ungültig.',
      );
    }

    final rpcEmployee = todayClockRaw['employee'];
    final rpcEntries = todayClockRaw['entries'];
    final rpcLastEntry = todayClockRaw['last_entry'];

    if (rpcEmployee is! Map<String, dynamic>) {
      throw StateError(
        'Die Mitarbeiterdaten der Zeiterfassung fehlen.',
      );
    }

    final businessLocalNow =
        todayClockRaw['business_local_now'] as String?;

    if (businessLocalNow == null || businessLocalNow.isEmpty) {
      throw StateError('Die aktuelle Betriebszeit fehlt.');
    }

    final employee = ClockEmployee(
      id: employeeId,
      name:
          (employeeData['name'] as String?)?.trim() ?? 'Mitarbeiter',
      businessId: businessId,
      businessName:
          (businessData?['name'] as String?)?.trim() ?? 'Betrieb',
      status: parseClockStatus(
        rpcEmployee['status'] as String?,
      ),
      locationTrackingMode:
          (employeeData['location_tracking_mode'] as String?) ??
              'required',
    );

    final entries = <ClockEntry>[];

    if (rpcEntries is List) {
      for (final row in rpcEntries) {
        if (row is Map<String, dynamic>) {
          entries.add(_clockEntryFromRpc(row));
        }
      }
    }

    final lastEntry =
        rpcLastEntry is Map<String, dynamic>
            ? _clockEntryFromRpc(rpcLastEntry)
            : null;

    return ClockData(
      employee: employee,
      entries: entries,
      workedMinutes:
          (todayClockRaw['worked_minutes'] as num?)?.toInt() ?? 0,
      lastEntry: lastEntry,
      businessTimezone:
          (todayClockRaw['business_timezone'] as String?) ??
              'Europe/Berlin',
      localDate:
          (todayClockRaw['local_date'] as String?) ?? '',
      businessLocalNow: businessLocalNow,
    );
  }

  ClockEntry _clockEntryFromRpc(
    Map<String, dynamic> row,
  ) {
    final createdAtRaw = row['created_at'] as String?;
    final localCreatedAtRaw =
        row['local_created_at'] as String?;

    if (createdAtRaw == null ||
        createdAtRaw.isEmpty ||
        localCreatedAtRaw == null ||
        localCreatedAtRaw.isEmpty) {
      throw StateError(
        'Zeitstempel der Stempelung sind unvollständig.',
      );
    }

    return ClockEntry(
      id: row['id'] as String,
      employeeId: row['employee_id'] as String,
      employeeName:
          (row['employee_name'] as String?) ?? '',
      action: row['action'] as String,
      createdAt: DateTime.parse(createdAtRaw),
      localCreatedAt: localCreatedAtRaw,
    );
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
      throw const AuthException(
        'Deine Anmeldung ist abgelaufen.',
      );
    }

    final baseUrl =
        AppEnvironment.apiBaseUrl.replaceAll(
      RegExp(r'/$'),
      '',
    );

    final response = await http.post(
      Uri.parse(
        '$baseUrl/api/time-entries/clock',
      ),
      headers: {
        'Content-Type': 'application/json',
        'Authorization':
            'Bearer ${session.accessToken}',
      },
      body: jsonEncode({
        'action':
            clockActionDatabaseValue(action),
        if (latitude != null)
          'latitude': latitude,
        if (longitude != null)
          'longitude': longitude,
        if (accuracy != null)
          'accuracy': accuracy,
        if (capturedAt != null)
          'capturedAt':
              capturedAt.toUtc().toIso8601String(),
      }),
    );

    final decoded = jsonDecode(response.body);

    if (decoded is! Map<String, dynamic>) {
      throw StateError(
        'Die Serverantwort war ungültig.',
      );
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

      throw StateError(
        'Die Stempelung konnte nicht gespeichert werden.',
      );
    }

    final entry =
        decoded['entry'] as Map<String, dynamic>;

    final employeeResult =
        decoded['employee'] as Map<String, dynamic>;

    final absoluteCreatedAt =
        DateTime.parse(
          entry['createdAt'] as String,
        ).toUtc();

    return ClockApiResult(
      entry: ClockEntry(
        id: (entry['id'] as String?) ??
            'temporary-${DateTime.now().millisecondsSinceEpoch}',
        employeeId: employee.id,
        employeeName: employee.name,
        action:
            entry['action'] as String? ??
                clockActionDatabaseValue(action),
        createdAt: absoluteCreatedAt,

        // Keine Gerätezeit daraus erzeugen.
        // Der Provider lädt direkt anschließend den RPC neu.
        localCreatedAt: null,
      ),
      status: parseClockStatus(
        employeeResult['status'] as String?,
      ),
    );
  }
}