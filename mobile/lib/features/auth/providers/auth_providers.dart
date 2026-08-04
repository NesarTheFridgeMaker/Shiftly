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
