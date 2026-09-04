import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/services/absence_service.dart';

final absenceServiceProvider = Provider<AbsenceService>((ref) {
  return AbsenceService(Supabase.instance.client);
});

final currentVacationBalanceProvider =
    FutureProvider<VacationBalance>((ref) async {
  final service = ref.watch(absenceServiceProvider);

  return service.getCurrentVacationBalance();
});
