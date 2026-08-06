import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/services/auth_service.dart';
import '../../../core/services/employee_service.dart';
import '../../../core/services/shift_service.dart';

final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

final authServiceProvider = Provider<AuthService>((ref) {
  final client = ref.watch(supabaseClientProvider);

  return AuthService(client);
});

final employeeServiceProvider = Provider<EmployeeService>((ref) {
  final client = ref.watch(supabaseClientProvider);

  return EmployeeService(client);
});

final currentEmployeeProvider = FutureProvider.autoDispose<EmployeeBasicData>((
  ref,
) async {
  final service = ref.watch(employeeServiceProvider);

  return service.getCurrentEmployee();
});

final shiftServiceProvider = Provider<ShiftService>((ref) {
  final client = ref.watch(supabaseClientProvider);

  return ShiftService(client);
});

final todayShiftsProvider = FutureProvider.autoDispose<List<EmployeeShift>>((
  ref,
) async {
  final employee = await ref.watch(currentEmployeeProvider.future);

  final shiftService = ref.watch(shiftServiceProvider);

  return shiftService.getTodayShifts(employeeId: employee.id);
});

final nextShiftProvider = FutureProvider.autoDispose<EmployeeShift?>((
  ref,
) async {
  final employee = await ref.watch(currentEmployeeProvider.future);

  final shiftService = ref.watch(shiftServiceProvider);

  return shiftService.getNextShift(employeeId: employee.id);
});

final monthShiftsProvider = FutureProvider.autoDispose
    .family<List<EmployeeShift>, String>((ref, monthKey) async {
      final month = _parseMonthKey(monthKey);

      final employee = await ref.watch(currentEmployeeProvider.future);

      final shiftService = ref.watch(shiftServiceProvider);

      return shiftService.getMonthShifts(
        employeeId: employee.id,
        year: month.year,
        month: month.month,
      );
    });

final teamMonthShiftsProvider = FutureProvider.autoDispose
    .family<List<EmployeeShift>, String>((ref, monthKey) async {
      final month = _parseMonthKey(monthKey);

      final employee = await ref.watch(currentEmployeeProvider.future);

      final businessId = employee.businessId;

      if (businessId == null || businessId.isEmpty) {
        throw StateError('Dem Mitarbeiter ist kein Betrieb zugeordnet.');
      }

      final shiftService = ref.watch(shiftServiceProvider);

      return shiftService.getTeamMonthShifts(
        businessId: businessId,
        year: month.year,
        month: month.month,
      );
    });

DateTime _parseMonthKey(String monthKey) {
  final parts = monthKey.split('-');

  if (parts.length != 2) {
    throw ArgumentError('Ungültiger Monatsschlüssel: $monthKey');
  }

  final year = int.tryParse(parts[0]);
  final month = int.tryParse(parts[1]);

  if (year == null || month == null || month < 1 || month > 12) {
    throw ArgumentError('Ungültiger Monatsschlüssel: $monthKey');
  }

  return DateTime(year, month, 1);
}
