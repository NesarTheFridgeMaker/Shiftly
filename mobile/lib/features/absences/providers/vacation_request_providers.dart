import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/absence_service.dart';
import '../../dashboard/providers/vacation_balance_providers.dart';

class VacationRequestController
    extends StateNotifier<AsyncValue<void>> {
  VacationRequestController(this._service)
      : super(const AsyncData(null));

  final AbsenceService _service;

  Future<bool> submit({
    required DateTime startDate,
    required DateTime endDate,
    String? note,
  }) async {
    state = const AsyncLoading();

    try {
      await _service.createVacationRequest(
        startDate: startDate,
        endDate: endDate,
        note: note,
      );

      state = const AsyncData(null);
      return true;
    } catch (error, stackTrace) {
      state = AsyncError(error, stackTrace);
      return false;
    }
  }

  void reset() {
    state = const AsyncData(null);
  }
}

final vacationRequestControllerProvider = StateNotifierProvider<
    VacationRequestController, AsyncValue<void>>((ref) {
  final service = ref.watch(absenceServiceProvider);

  return VacationRequestController(service);
});
