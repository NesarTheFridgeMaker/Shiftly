import 'dart:async';

import 'package:geolocator/geolocator.dart';

class MeasuredLocation {
  const MeasuredLocation({
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.capturedAt,
  });

  final double latitude;
  final double longitude;
  final double accuracy;
  final DateTime capturedAt;
}

class LocationService {
  const LocationService();

  Future<MeasuredLocation> getBestCurrentLocation() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();

    if (!serviceEnabled) {
      throw StateError(
        'Die Standortdienste sind deaktiviert. '
        'Bitte aktiviere GPS und versuche es erneut.',
      );
    }

    var permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied) {
      throw StateError(
        'Der Standortzugriff wurde abgelehnt. '
        'Ohne Standortfreigabe ist diese Stempelung nicht möglich.',
      );
    }

    if (permission == LocationPermission.deniedForever) {
      throw StateError(
        'Der Standortzugriff wurde dauerhaft abgelehnt. '
        'Bitte erlaube ihn in den App-Einstellungen.',
      );
    }

    Position? bestPosition;

    final positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: 0,
      ),
    );

    final completer = Completer<Position>();
    late final StreamSubscription<Position> subscription;
    Timer? timeoutTimer;

    Future<void> finish(Position position) async {
      if (completer.isCompleted) {
        return;
      }

      completer.complete(position);

      timeoutTimer?.cancel();
      await subscription.cancel();
    }

    subscription = positionStream.listen(
      (position) {
        if (bestPosition == null ||
            position.accuracy < bestPosition!.accuracy) {
          bestPosition = position;
        }

        // Wie in der Webversion:
        // Bei 25 Metern Genauigkeit oder besser sofort verwenden.
        if (position.accuracy <= 25) {
          finish(position);
        }
      },
      onError: (Object error) {
        if (!completer.isCompleted) {
          completer.completeError(
            StateError('Dein Standort konnte nicht ermittelt werden.'),
          );
        }

        timeoutTimer?.cancel();
      },
    );

    timeoutTimer = Timer(const Duration(seconds: 12), () {
      final position = bestPosition;

      if (position != null) {
        finish(position);
        return;
      }

      if (!completer.isCompleted) {
        completer.completeError(
          StateError(
            'Dein Standort konnte nicht rechtzeitig '
            'ermittelt werden.',
          ),
        );
      }

      subscription.cancel();
    });

    final position = await completer.future;

    return MeasuredLocation(
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      capturedAt: position.timestamp,
    );
  }

  Future<void> openAppSettings() async {
    await Geolocator.openAppSettings();
  }

  Future<void> openLocationSettings() async {
    await Geolocator.openLocationSettings();
  }
}
