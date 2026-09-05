import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../constants/app_environment.dart';

class EmployeeRegistrationService {
  EmployeeRegistrationService({
    required SupabaseClient client,
    http.Client? httpClient,
  })  : _client = client,
        _httpClient = httpClient ?? http.Client();

  final SupabaseClient _client;
  final http.Client _httpClient;

  String get _baseUrl =>
      AppEnvironment.apiBaseUrl.replaceAll(RegExp(r'/$'), '');

  Future<void> validateInviteCode(String inviteCode) async {
    final code = inviteCode.trim().toUpperCase();

    if (code.isEmpty) {
      throw const EmployeeRegistrationException(
        'Bitte gib einen Einladungscode ein.',
      );
    }

    final response = await _httpClient.post(
      Uri.parse('$_baseUrl/api/employee-register/validate'),
      headers: const {
        'content-type': 'application/json',
        'accept': 'application/json',
      },
      body: jsonEncode({'inviteCode': code}),
    );

    Map<String, dynamic> json;

    try {
      json = Map<String, dynamic>.from(
        jsonDecode(response.body) as Map,
      );
    } catch (_) {
      throw const EmployeeRegistrationException(
        'Der Dipera-Server hat ungültige Daten zurückgegeben.',
      );
    }

    final success = json['success'] == true;
    final role = (json['role'] as String?)?.trim().toLowerCase();
    final message = (json['message'] as String?)?.trim() ??
        'Der Einladungscode konnte nicht geprüft werden.';

    if (!success || response.statusCode < 200 || response.statusCode >= 300) {
      throw EmployeeRegistrationException(message);
    }

    if (role != 'employee') {
      throw const EmployeeRegistrationException(
        'Diese Einladung ist nicht für die Mitarbeiter-App vorgesehen.',
      );
    }
  }

  Future<String> registerEmployee({
    required String inviteCode,
    required String email,
    required String password,
  }) async {
    final code = inviteCode.trim().toUpperCase();
    final normalizedEmail = email.trim().toLowerCase();

    await validateInviteCode(code);

    try {
      final result = await _client.auth.signUp(
        email: normalizedEmail,
        password: password,
        emailRedirectTo: '$_baseUrl/auth/callback',
        data: {
          'registration_type': 'employee_invite',
          'invite_code': code,
        },
      );

      if (result.user == null) {
        throw const EmployeeRegistrationException(
          'Das Benutzerkonto konnte nicht erstellt werden.',
        );
      }

      return normalizedEmail;
    } on AuthException catch (error) {
      final message = error.message.toLowerCase();

      if (message.contains('already registered') ||
          message.contains('already been registered')) {
        throw const EmployeeRegistrationException(
          'Für diese E-Mail-Adresse existiert bereits ein Dipera-Konto.',
        );
      }

      if (message.contains('too many requests') ||
          message.contains('rate limit')) {
        throw const EmployeeRegistrationException(
          'Zu viele Registrierungsversuche. Bitte warte kurz.',
        );
      }

      throw EmployeeRegistrationException(error.message);
    }
  }

  void dispose() {
    _httpClient.close();
  }
}

class EmployeeRegistrationException implements Exception {
  const EmployeeRegistrationException(this.message);

  final String message;

  @override
  String toString() => message;
}
