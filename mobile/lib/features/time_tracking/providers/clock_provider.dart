import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/clock_service.dart';
import '../../../core/services/location_service.dart';
import '../../auth/providers/auth_providers.dart';

class ClockState {
  const ClockState({
    this.data,
    this.isLoading = false,
    this.isProcessing = false,
    this.isLocating = false,
    this.successAction,
    this.errorMessage,
  });

  final ClockData? data;
  final bool isLoading;
  final bool isProcessing;
  final bool isLocating;
  final ClockAction? successAction;
  final String? errorMessage;

  ClockState copyWith({
    ClockData? data,
    bool? isLoading,
    bool? isProcessing,
    bool? isLocating,
    ClockAction? successAction,
    String? errorMessage,
    bool clearSuccessAction = false,
    bool clearError = false,
  }) {
    return ClockState(
      data: data ?? this.data,
      isLoading: isLoading ?? this.isLoading,
      isProcessing: isProcessing ?? this.isProcessing,
      isLocating: isLocating ?? this.isLocating,
      successAction: clearSuccessAction
          ? null
          : successAction ?? this.successAction,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

class ClockController extends StateNotifier<ClockState> {
  ClockController(this._clockService, this._locationService)
    : super(const ClockState(isLoading: true)) {
    load();
  }

  final ClockService _clockService;
  final LocationService _locationService;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final data = await _clockService.loadClockData();

      state = ClockState(data: data, isLoading: false);
    } catch (error) {
      state = ClockState(isLoading: false, errorMessage: _cleanError(error));
    }
  }

  void clearFeedback() {
    state = state.copyWith(clearSuccessAction: true, clearError: true);
  }

  Future<void> performAction(ClockAction action) async {
    final currentData = state.data;

    if (currentData == null || state.isProcessing) {
      return;
    }

    final employee = currentData.employee;
    final needsLocation = employee.locationTrackingMode != 'disabled';

    state = state.copyWith(
      isProcessing: true,
      isLocating: needsLocation,
      clearSuccessAction: true,
      clearError: true,
    );

    try {
      MeasuredLocation? location;

      if (needsLocation) {
        location = await _locationService.getBestCurrentLocation();

        state = state.copyWith(isLocating: false);
      }

      final result = await _clockService.performClockAction(
        employee: employee,
        action: action,
        latitude: location?.latitude,
        longitude: location?.longitude,
        accuracy: location?.accuracy,
        capturedAt: location?.capturedAt,
      );

      final refreshedData = await _clockService.loadClockData();

      state = ClockState(
        data: ClockData(
          employee: refreshedData.employee.copyWith(status: result.status),
          entries: refreshedData.entries,
        ),
        isProcessing: false,
        isLocating: false,
        successAction: action,
      );
    } catch (error) {
      state = state.copyWith(
        isProcessing: false,
        isLocating: false,
        errorMessage: _cleanError(error),
      );
    }
  }

  String _cleanError(Object error) {
    return error
        .toString()
        .replaceFirst('Bad state: ', '')
        .replaceFirst('StateError: ', '')
        .replaceFirst('AuthException: ', '');
  }
}

final clockServiceProvider = Provider<ClockService>((ref) {
  final client = ref.watch(supabaseClientProvider);

  return ClockService(client);
});

final locationServiceProvider = Provider<LocationService>((ref) {
  return const LocationService();
});

final clockControllerProvider =
    StateNotifierProvider.autoDispose<ClockController, ClockState>((ref) {
      final clockService = ref.watch(clockServiceProvider);
      final locationService = ref.watch(locationServiceProvider);

      return ClockController(clockService, locationService);
    });
