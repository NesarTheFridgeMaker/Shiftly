import 'dart:async';

import 'dart:convert';

import 'dart:io';



import 'package:firebase_core/firebase_core.dart';

import 'package:firebase_messaging/firebase_messaging.dart';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'package:supabase_flutter/supabase_flutter.dart';



enum PushDiagnosticStepState { pending, success, failure }



class PushDiagnosticStatus {

  const PushDiagnosticStatus({

    this.permission = PushDiagnosticStepState.pending,

    this.apns = PushDiagnosticStepState.pending,

    this.fcm = PushDiagnosticStepState.pending,

    this.registration = PushDiagnosticStepState.pending,
    this.nativeApns = PushDiagnosticStepState.pending,

    this.permissionDetail = 'Noch nicht geprüft',

    this.apnsDetail = 'Noch nicht geprüft',

    this.fcmDetail = 'Noch nicht geprüft',

    this.registrationDetail = 'Noch nicht geprüft',
    this.nativeApnsDetail = 'Noch nicht geprüft',

  });



  final PushDiagnosticStepState permission;

  final PushDiagnosticStepState apns;

  final PushDiagnosticStepState fcm;

  final PushDiagnosticStepState registration;
  final PushDiagnosticStepState nativeApns;

  final String permissionDetail;

  final String apnsDetail;

  final String fcmDetail;

  final String registrationDetail;
  final String nativeApnsDetail;



  PushDiagnosticStatus copyWith({

    PushDiagnosticStepState? permission,

    PushDiagnosticStepState? apns,

    PushDiagnosticStepState? fcm,

    PushDiagnosticStepState? registration,
    PushDiagnosticStepState? nativeApns,

    String? permissionDetail,

    String? apnsDetail,

    String? fcmDetail,

    String? registrationDetail,
    String? nativeApnsDetail,

  }) {

    return PushDiagnosticStatus(

      permission: permission ?? this.permission,

      apns: apns ?? this.apns,

      fcm: fcm ?? this.fcm,

      registration: registration ?? this.registration,
      nativeApns: nativeApns ?? this.nativeApns,

      permissionDetail: permissionDetail ?? this.permissionDetail,

      apnsDetail: apnsDetail ?? this.apnsDetail,

      fcmDetail: fcmDetail ?? this.fcmDetail,

      registrationDetail: registrationDetail ?? this.registrationDetail,
      nativeApnsDetail: nativeApnsDetail ?? this.nativeApnsDetail,

    );

  }

}



class PushNotificationService {

  PushNotificationService(this._client);



  final SupabaseClient _client;

  static const MethodChannel _apnsDiagnosticsChannel =
      MethodChannel('app.dipera.mobile/apns_diagnostics');



  static final ValueNotifier<PushDiagnosticStatus> diagnosticStatus =

      ValueNotifier<PushDiagnosticStatus>(const PushDiagnosticStatus());



  static void _updateDiagnostic(PushDiagnosticStatus status) {

    diagnosticStatus.value = status;

  }



  final FirebaseMessaging _messaging = FirebaseMessaging.instance;



  final FlutterLocalNotificationsPlugin _localNotifications =

      FlutterLocalNotificationsPlugin();



  StreamSubscription<RemoteMessage>? _foregroundSubscription;

  StreamSubscription<String>? _tokenRefreshSubscription;



  bool _listenersInitialized = false;

  bool _localNotificationsInitialized = false;



  static const String _channelId = 'dipera_high_importance_v1';



  static const String _channelName = 'Dipera Benachrichtigungen';



  static const String _channelDescription =

      'Wichtige Benachrichtigungen zu Schichten, '

      'Dokumenten, Abwesenheiten und weiteren '

      'Dipera-Aktualisierungen.';



  Future<String?> initialize() async {

    final previous = diagnosticStatus.value;
    _updateDiagnostic(PushDiagnosticStatus(
      nativeApns: previous.nativeApns,
      nativeApnsDetail: previous.nativeApnsDetail,
    ));
    await _refreshNativeApnsDiagnostic();

    await _initializeLocalNotifications();



    final settings = await _messaging.requestPermission(

      alert: true,

      badge: true,

      sound: true,

      provisional: false,

    );



    final permissionGranted =

        settings.authorizationStatus == AuthorizationStatus.authorized ||

        settings.authorizationStatus == AuthorizationStatus.provisional;



    _updateDiagnostic(

      diagnosticStatus.value.copyWith(

        permission: permissionGranted

            ? PushDiagnosticStepState.success

            : PushDiagnosticStepState.failure,

        permissionDetail: _authorizationStatusLabel(

          settings.authorizationStatus,

        ),

      ),

    );



    if (!permissionGranted) return null;



    if (Platform.isIOS || Platform.isMacOS) {

      await _messaging.setForegroundNotificationPresentationOptions(

        alert: true,

        badge: true,

        sound: true,

      );



      final apnsTokenAvailable = await _waitForApnsToken();

      _updateDiagnostic(

        diagnosticStatus.value.copyWith(

          apns: apnsTokenAvailable

              ? PushDiagnosticStepState.success

              : PushDiagnosticStepState.failure,

          apnsDetail: apnsTokenAvailable

              ? 'Token verfügbar'

              : 'Nach 5 Sekunden nicht verfügbar',

        ),

      );

      if (!apnsTokenAvailable) {

        _initializeListeners();

        return null;

      }

    } else {

      _updateDiagnostic(

        diagnosticStatus.value.copyWith(

          apns: PushDiagnosticStepState.success,

          apnsDetail: 'Nicht erforderlich',

        ),

      );

    }



    String? token;

    try {

      token = await _messaging.getToken();

    } catch (error, stackTrace) {

      _updateDiagnostic(

        diagnosticStatus.value.copyWith(

          fcm: PushDiagnosticStepState.failure,

          fcmDetail: _safeErrorLabel(error),

        ),

      );

      if (kDebugMode) debugPrintStack(stackTrace: stackTrace);

      _initializeListeners();

      return null;

    }



    if (token == null || token.isEmpty) {

      _updateDiagnostic(

        diagnosticStatus.value.copyWith(

          fcm: PushDiagnosticStepState.failure,

          fcmDetail: 'Kein Token zurückgegeben',

        ),

      );

      _initializeListeners();

      return null;

    }



    _updateDiagnostic(

      diagnosticStatus.value.copyWith(

        fcm: PushDiagnosticStepState.success,

        fcmDetail: 'Token verfügbar',

      ),

    );



    try {

      await _saveToken(token);

      _updateDiagnostic(

        diagnosticStatus.value.copyWith(

          registration: PushDiagnosticStepState.success,

          registrationDetail: 'Registriert',

        ),

      );

    } catch (error, stackTrace) {

      _updateDiagnostic(

        diagnosticStatus.value.copyWith(

          registration: PushDiagnosticStepState.failure,

          registrationDetail: _safeErrorLabel(error),

        ),

      );

      if (kDebugMode) debugPrintStack(stackTrace: stackTrace);

    }



    _initializeListeners();

    return token;

  }



  String _authorizationStatusLabel(AuthorizationStatus status) {

    switch (status) {

      case AuthorizationStatus.authorized:

        return 'Erteilt';

      case AuthorizationStatus.provisional:

        return 'Vorläufig erteilt';

      case AuthorizationStatus.denied:

        return 'Abgelehnt';

      case AuthorizationStatus.notDetermined:

        return 'Noch nicht entschieden';

    }

  }



  String _safeErrorLabel(Object error) {

    if (error is PostgrestException) {

      final code = error.code;

      return code != null && code.isNotEmpty

          ? 'Serverfehler $code'

          : 'Serverfehler';

    }

    if (error is FirebaseException) {

      return error.code.isNotEmpty

          ? 'Firebase-Fehler ${error.code}'

          : 'Firebase-Fehler';

    }

    if (error is StateError) return error.message;

    return error.runtimeType.toString();

  }



  Future<void> _refreshNativeApnsDiagnostic() async {
    if (!Platform.isIOS) return;

    try {
      final result = await _apnsDiagnosticsChannel
          .invokeMapMethod<String, dynamic>('getRegistrationStatus');
      final state = result?['state'] as String? ?? 'unavailable';
      final error = result?['error'] as String? ?? '';

      final PushDiagnosticStepState step;
      final String detail;
      switch (state) {
        case 'success':
          step = PushDiagnosticStepState.success;
          detail = 'APNs-Token nativ empfangen';
        case 'failure':
          step = PushDiagnosticStepState.failure;
          detail = error.isEmpty ? 'iOS-Registrierung fehlgeschlagen' : error;
        case 'requested':
          step = PushDiagnosticStepState.pending;
          detail = 'Bei iOS angefordert';
        case 'not_requested':
          step = PushDiagnosticStepState.pending;
          detail = 'Noch nicht angefordert';
        default:
          step = PushDiagnosticStepState.failure;
          detail = 'Diagnosestatus nicht verfügbar';
      }

      _updateDiagnostic(diagnosticStatus.value.copyWith(
        nativeApns: step,
        nativeApnsDetail: detail,
      ));
    } catch (error) {
      _updateDiagnostic(diagnosticStatus.value.copyWith(
        nativeApns: PushDiagnosticStepState.failure,
        nativeApnsDetail: 'Channel: ${error.runtimeType}',
      ));
    }
  }

  Future<bool> _waitForApnsToken() async {

    const maxAttempts = 10;

    const delay = Duration(milliseconds: 500);



    for (var attempt = 1; attempt <= maxAttempts; attempt++) {

      await _refreshNativeApnsDiagnostic();
      final apnsToken = await _messaging.getAPNSToken();



      if (apnsToken != null && apnsToken.isNotEmpty) {

        if (kDebugMode) {

          debugPrint('PUSH: APNs-Token verfügbar.');

        }



        return true;

      }



      if (kDebugMode) {

        debugPrint(

          'PUSH: Warte auf APNs-Token '

          '($attempt/$maxAttempts).',

        );

      }



      if (attempt < maxAttempts) {

        await Future<void>.delayed(delay);

      }

    }



    return false;

  }



  Future<void> _initializeLocalNotifications() async {

    if (_localNotificationsInitialized) {

      return;

    }



    const androidInitializationSettings = AndroidInitializationSettings(

      '@mipmap/ic_launcher',

    );



    const darwinInitializationSettings = DarwinInitializationSettings();



    const initializationSettings = InitializationSettings(

      android: androidInitializationSettings,

      iOS: darwinInitializationSettings,

    );



    await _localNotifications.initialize(

      settings: initializationSettings,

      onDidReceiveNotificationResponse: _handleNotificationTap,

    );



    /*

     * Android Notification Channel.

     *

     * Importance.max sorgt für Heads-up-Banner,

     * sofern Android/Samsung diese nicht in den

     * Systemeinstellungen deaktiviert hat.

     */

    const channel = AndroidNotificationChannel(

      _channelId,

      _channelName,

      description: _channelDescription,

      importance: Importance.max,

      playSound: true,

      enableVibration: true,

      showBadge: true,

    );



    final androidPlugin = _localNotifications

        .resolvePlatformSpecificImplementation<

          AndroidFlutterLocalNotificationsPlugin

        >();



    await androidPlugin?.createNotificationChannel(channel);



    _localNotificationsInitialized = true;



    if (kDebugMode) {

      debugPrint('PUSH: Lokaler High-Importance-Channel initialisiert.');

    }

  }



  void _initializeListeners() {

    if (_listenersInitialized) {

      return;

    }



    /*

     * Nachricht trifft ein, während Dipera geöffnet ist.

     */

    _foregroundSubscription = FirebaseMessaging.onMessage.listen((

      RemoteMessage message,

    ) async {

      if (kDebugMode) {

        debugPrint('PUSH: Nachricht im Vordergrund erhalten.');

      }



      /*

         * Android zeigt FCM-Notifications im

         * Vordergrund nicht automatisch sichtbar an.

         *

         * Deshalb erzeugen wir hier selbst eine

         * lokale Heads-up-Benachrichtigung.

         */

      if (Platform.isAndroid) {

        await _showForegroundNotification(message);

      }

    });



    /*

     * Firebase kann Tokens erneuern.

     */

    _tokenRefreshSubscription = _messaging.onTokenRefresh.listen((

      String newToken,

    ) async {

      try {

        await _saveToken(newToken);



        if (kDebugMode) {

          debugPrint('PUSH: Aktualisierter FCM-Token gespeichert.');

        }

      } catch (error, stackTrace) {

        if (kDebugMode) {

          debugPrint(

            'PUSH: Token-Refresh konnte nicht gespeichert werden: '

            '$error',

          );

          debugPrintStack(stackTrace: stackTrace);

        }

      }

    });



    /*

     * Nachricht wurde angeklickt,

     * während App im Hintergrund war.

     */

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {

      if (kDebugMode) {

        debugPrint('PUSH: Benachrichtigung wurde geöffnet.');

      }



      /*

         * Hier können wir später navigieren:

         *

         * type = shift      -> Schichten

         * type = document   -> Dokumente

         * type = absence    -> Abwesenheiten

         */

    });



    _listenersInitialized = true;

  }



  Future<void> _showForegroundNotification(RemoteMessage message) async {

    final notification = message.notification;



    final title = notification?.title ?? message.data['title'] ?? 'Dipera';



    final body =

        notification?.body ??

        message.data['body'] ??

        'Es gibt eine neue Mitteilung.';



    const androidDetails = AndroidNotificationDetails(

      _channelId,

      _channelName,

      channelDescription: _channelDescription,

      importance: Importance.max,

      priority: Priority.high,

      playSound: true,

      enableVibration: true,

      enableLights: true,

      showWhen: true,

    );



    const notificationDetails = NotificationDetails(android: androidDetails);



    final notificationId = DateTime.now().millisecondsSinceEpoch.remainder(

      2147483647,

    );



    await _localNotifications.show(

      id: notificationId,

      title: title,

      body: body,

      notificationDetails: notificationDetails,

      payload: jsonEncode(message.data),

    );



    if (kDebugMode) {

      debugPrint('PUSH: Vordergrund-Banner angezeigt.');

    }

  }



  void _handleNotificationTap(NotificationResponse response) {

    if (kDebugMode) {

      debugPrint('PUSH: Lokale Benachrichtigung geöffnet.');

    }



    /*

     * Hier bauen wir anschließend die Navigation ein.

     *

     * response.payload kann dann gezielt ausgewertet werden.

     */

  }



  Future<void> _saveToken(String token) async {

    final user = _client.auth.currentUser;



    if (user == null) {

      throw StateError('Kein angemeldeter Benutzer vorhanden.');

    }



    final platform = Platform.isAndroid

        ? 'android'

        : Platform.isIOS

        ? 'ios'

        : null;



    if (platform == null) {

      return;

    }



    await _client.rpc(

      'register_my_push_device',

      params: {'p_fcm_token': token, 'p_platform': platform},

    );

  }



  Future<void> unregisterCurrentDevice() async {

    try {

      /*

       * Auch beim Abmelden darf auf Apple nicht vor

       * Verfügbarkeit des APNs-Tokens auf FCM zugegriffen werden.

       */

      if (Platform.isIOS || Platform.isMacOS) {

        final apnsTokenAvailable = await _waitForApnsToken();



        if (!apnsTokenAvailable) {

          return;

        }

      }



      final token = await _messaging.getToken();



      if (token == null || token.isEmpty) {

        return;

      }



      if (_client.auth.currentUser == null) {

        return;

      }



      await _client.rpc(

        'unregister_my_push_device',

        params: {'p_fcm_token': token},

      );



      if (kDebugMode) {

        debugPrint('PUSH: Gerät wurde deregistriert.');

      }

    } catch (error, stackTrace) {

      if (kDebugMode) {

        debugPrint(

          'PUSH: Gerät konnte nicht deregistriert werden: '

          '$error',

        );

        debugPrintStack(stackTrace: stackTrace);

      }

    }

  }



  Future<void> dispose() async {

    await _foregroundSubscription?.cancel();

    await _tokenRefreshSubscription?.cancel();



    _foregroundSubscription = null;

    _tokenRefreshSubscription = null;



    _listenersInitialized = false;

  }

}
