import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/pay_overview_service.dart';
import '../../auth/providers/auth_providers.dart';

final payOverviewServiceProvider =
    Provider<PayOverviewService>((ref) {
  final client = ref.watch(
    supabaseClientProvider,
  );

  return PayOverviewService(client);
});

final payOverviewMonthProvider =
    FutureProvider.autoDispose
        .family<EmployeePayOverview?, String>(
  (ref, monthKey) async {
    final parts = monthKey.split('-');

    if (parts.length != 2) {
      throw ArgumentError(
        'Ungültiger Monatsschlüssel: $monthKey',
      );
    }

    final year = int.tryParse(parts[0]);
    final month = int.tryParse(parts[1]);

    if (year == null ||
        month == null ||
        month < 1 ||
        month > 12) {
      throw ArgumentError(
        'Ungültiger Monatsschlüssel: $monthKey',
      );
    }

    // Bewusste Abhängigkeit vom aktuell
    // eingeloggten Mitarbeiter.
    //
    // Die employee_id wird NICHT an die
    // Payroll-RPC übergeben. Die RPC ermittelt
    // den Mitarbeiter serverseitig über auth.uid().
    await ref.watch(
      currentEmployeeProvider.future,
    );

    final service = ref.watch(
      payOverviewServiceProvider,
    );

    return service.getMonth(
      year: year,
      month: month,
    );
  },
);