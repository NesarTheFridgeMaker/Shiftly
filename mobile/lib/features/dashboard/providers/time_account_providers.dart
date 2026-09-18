import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/services/working_time_service.dart';
import '../../auth/providers/auth_providers.dart';

final workingTimeServiceProvider =
    Provider<WorkingTimeService>((ref) {
  return WorkingTimeService(
    Supabase.instance.client,
  );
});

final currentTimeAccountDashboardProvider =
    FutureProvider.autoDispose<TimeAccountDashboard>((ref) async {
  // Bewusst vom aktuell eingeloggten Mitarbeiter abhängig machen.
  //
  // Dadurch wird der Stundenkonto-Provider neu berechnet,
  // sobald sich der Mitarbeiter ändert.
  await ref.watch(currentEmployeeProvider.future);

  final service = ref.watch(
    workingTimeServiceProvider,
  );

  return service.getCurrentTimeAccountDashboard();
});