import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/working_time_service.dart';
import '../../auth/providers/auth_providers.dart';

final workingTimeServiceProvider = Provider<WorkingTimeService>((ref) {
  final client = ref.watch(supabaseClientProvider);

  return WorkingTimeService(client);
});

final workingTimeMonthProvider = FutureProvider.autoDispose
    .family<WorkingTimeMonth, String>((ref, monthKey) async {
      final parts = monthKey.split('-');

      if (parts.length != 2) {
        throw ArgumentError('Ungültiger Monatsschlüssel: $monthKey');
      }

      final year = int.tryParse(parts[0]);
      final month = int.tryParse(parts[1]);

      if (year == null || month == null || month < 1 || month > 12) {
        throw ArgumentError('Ungültiger Monatsschlüssel: $monthKey');
      }

      final employee = await ref.watch(currentEmployeeProvider.future);

      final service = ref.watch(workingTimeServiceProvider);

      return service.getMonth(
        employeeId: employee.id,
        year: year,
        month: month,
      );
    });
