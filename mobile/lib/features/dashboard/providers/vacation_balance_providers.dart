import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/services/absence_service.dart';
import '../../auth/providers/auth_providers.dart';

final absenceServiceProvider = Provider<AbsenceService>((ref) {
  return AbsenceService(Supabase.instance.client);
});

final currentVacationBalanceProvider =
    FutureProvider.autoDispose<VacationBalance>((ref) async {
  await ref.watch(currentEmployeeProvider.future);

  final service = ref.watch(absenceServiceProvider);

  return service.getCurrentVacationBalance();
});