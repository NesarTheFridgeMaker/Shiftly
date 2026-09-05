import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../constants/app_environment.dart';

class TerminalTeamMember {
  const TerminalTeamMember({
    required this.id,
    required this.name,
    required this.status,
  });

  final String id;
  final String name;
  final String status;

  factory TerminalTeamMember.fromJson(Map<String, dynamic> json) {
    return TerminalTeamMember(
      id: json['id'] as String,
      name: (json['name'] as String?)?.trim() ?? '',
      status: (json['status'] as String?)?.trim() ?? 'unknown',
    );
  }
}

class TerminalStatus {
  const TerminalStatus({
    required this.businessName,
    required this.total,
    required this.working,
    required this.onBreak,
    required this.absent,
    required this.workingEmployees,
    required this.breakEmployees,
    required this.absentEmployees,
  });

  final String businessName;
  final int total;
  final int working;
  final int onBreak;
  final int absent;
  final List<TerminalTeamMember> workingEmployees;
  final List<TerminalTeamMember> breakEmployees;
  final List<TerminalTeamMember> absentEmployees;

  int get present => working + onBreak;

  factory TerminalStatus.fromJson(Map<String, dynamic> json) {
    final business = Map<String, dynamic>.from(
      json['business'] as Map,
    );
    final counts = Map<String, dynamic>.from(
      json['counts'] as Map,
    );

    List<TerminalTeamMember> parseList(dynamic value) {
      return (value as List<dynamic>? ?? const [])
          .map(
            (item) => TerminalTeamMember.fromJson(
              Map<String, dynamic>.from(item as Map),
            ),
          )
          .toList();
    }

    return TerminalStatus(
      businessName:
          (business['name'] as String?)?.trim() ?? 'Dipera Betrieb',
      total: (counts['total'] as num?)?.toInt() ?? 0,
      working: (counts['working'] as num?)?.toInt() ?? 0,
      onBreak: (counts['onBreak'] as num?)?.toInt() ?? 0,
      absent: (counts['absent'] as num?)?.toInt() ?? 0,
      workingEmployees: parseList(json['working']),
      breakEmployees: parseList(json['onBreak']),
      absentEmployees: parseList(json['absent']),
    );
  }
}

class TerminalEmployeeLookup {
  const TerminalEmployeeLookup({
    required this.id,
    required this.name,
    required this.status,
    required this.allowedActions,
  });

  final String id;
  final String name;
  final String status;
  final List<String> allowedActions;

  factory TerminalEmployeeLookup.fromJson(
    Map<String, dynamic> json,
  ) {
    return TerminalEmployeeLookup(
      id: json['id'] as String,
      name: (json['name'] as String?)?.trim() ?? '',
      status: (json['status'] as String?)?.trim() ?? 'unknown',
      allowedActions: (json['allowedActions'] as List<dynamic>? ?? const [])
          .map((value) => value.toString())
          .toList(),
    );
  }
}

class TerminalClockResult {
  const TerminalClockResult({
    required this.entryId,
    required this.employeeId,
    required this.employeeName,
    required this.status,
    required this.action,
    required this.createdAt,
  });

  final String? entryId;
  final String employeeId;
  final String employeeName;
  final String status;
  final String action;
  final DateTime createdAt;
}

class TerminalService {
  TerminalService({
    required SupabaseClient supabase,
    http.Client? httpClient,
  })  : _supabase = supabase,
        _httpClient = httpClient ?? http.Client();

  final SupabaseClient _supabase;
  final http.Client _httpClient;

  String get _baseUrl =>
      AppEnvironment.apiBaseUrl.replaceAll(RegExp(r'/$'), '');

  Future<Map<String, String>> _headers() async {
    final session = _supabase.auth.currentSession;

    if (session == null) {
      throw const TerminalApiException(
        'AUTH_REQUIRED',
        'Die Terminal-Anmeldung ist nicht mehr gültig.',
      );
    }

    return {
      'authorization': 'Bearer ${session.accessToken}',
      'content-type': 'application/json',
      'accept': 'application/json',
    };
  }

  Future<TerminalStatus> getStatus() async {
    final response = await _httpClient.get(
      Uri.parse('$_baseUrl/api/kiosk/status'),
      headers: await _headers(),
    );

    final json = _decode(response);

    return TerminalStatus.fromJson(json);
  }

  Future<TerminalEmployeeLookup> lookupPin(String pin) async {
    final response = await _httpClient.post(
      Uri.parse('$_baseUrl/api/kiosk/lookup'),
      headers: await _headers(),
      body: jsonEncode({'pin': pin}),
    );

    final json = _decode(response);
    final employee = Map<String, dynamic>.from(
      json['employee'] as Map,
    );

    return TerminalEmployeeLookup.fromJson(employee);
  }

  Future<TerminalClockResult> clock({
    required String pin,
    required String action,
  }) async {
    final response = await _httpClient.post(
      Uri.parse('$_baseUrl/api/kiosk/clock'),
      headers: await _headers(),
      body: jsonEncode({
        'pin': pin,
        'action': action,
      }),
    );

    final json = _decode(response);

    final entry = Map<String, dynamic>.from(
      json['entry'] as Map? ?? const {},
    );
    final employee = Map<String, dynamic>.from(
      json['employee'] as Map,
    );

    final createdAt =
        DateTime.tryParse(entry['createdAt']?.toString() ?? '');

    return TerminalClockResult(
      entryId: entry['id']?.toString(),
      employeeId: employee['id'] as String,
      employeeName:
          (employee['name'] as String?)?.trim() ?? '',
      status:
          (employee['status'] as String?)?.trim() ?? 'unknown',
      action: entry['action']?.toString() ?? action,
      createdAt: createdAt ?? DateTime.now(),
    );
  }

  Map<String, dynamic> _decode(http.Response response) {
    Map<String, dynamic> json;

    try {
      json = Map<String, dynamic>.from(
        jsonDecode(response.body) as Map,
      );
    } catch (_) {
      throw TerminalApiException(
        'INVALID_RESPONSE',
        'Der Terminal-Server hat ungültige Daten zurückgegeben.',
      );
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = json['error'];

      if (error is Map) {
        final mapped = Map<String, dynamic>.from(error);

        throw TerminalApiException(
          mapped['code']?.toString() ?? 'REQUEST_FAILED',
          mapped['message']?.toString() ??
              'Die Anfrage konnte nicht verarbeitet werden.',
          retryAfterSeconds:
              (mapped['retryAfterSeconds'] as num?)?.toInt(),
        );
      }

      throw TerminalApiException(
        'REQUEST_FAILED',
        'Die Anfrage konnte nicht verarbeitet werden.',
      );
    }

    return json;
  }

  void dispose() {
    _httpClient.close();
  }
}

class TerminalApiException implements Exception {
  const TerminalApiException(
    this.code,
    this.message, {
    this.retryAfterSeconds,
  });

  final String code;
  final String message;
  final int? retryAfterSeconds;

  @override
  String toString() => message;
}
