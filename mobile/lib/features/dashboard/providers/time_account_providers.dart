import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/services/working_time_service.dart';

final workingTimeServiceProvider =
    Provider<WorkingTimeService>((ref) {
  return WorkingTimeService(
    Supabase.instance.client,
  );
});

final currentTimeAccountDashboardProvider =
    FutureProvider<TimeAccountDashboard>((ref) async {
  final service = ref.watch(
    workingTimeServiceProvider,
  );

  return service.getCurrentTimeAccountDashboard();
});
