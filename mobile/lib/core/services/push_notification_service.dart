import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PushNotificationService {
  PushNotificationService(this._client);

  final SupabaseClient _client;

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
    await _initializeLocalNotifications();

    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (kDebugMode) {
      debugPrint(
        'PUSH: Berechtigungsstatus = '
        '${settings.authorizationStatus}',
      );
    }

    if (settings.authorizationStatus == AuthorizationStatus.denied ||
        settings.authorizationStatus == AuthorizationStatus.notDetermined) {
      if (kDebugMode) {
        debugPrint(
          'PUSH: Benachrichtigungen nicht freigegeben.',
        );
      }

      return null;
    }

    /*
     * Für iOS/macOS:
     * Im Vordergrund dürfen Benachrichtigungen
     * direkt vom Betriebssystem dargestellt werden.
     *
     * Unter Android zeigen wir sie über
     * flutter_local_notifications.
     */
    if (Platform.isIOS || Platform.isMacOS) {
      await _messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );
    }

    final token = await _messaging.getToken();

    if (token != null && token.isNotEmpty) {
      await _saveToken(token);

      if (kDebugMode) {
        debugPrint(
          'PUSH: FCM-Token erfolgreich registriert.',
        );
      }
    }

    _initializeListeners();

    return token;
  }

  Future<void> _initializeLocalNotifications() async {
    if (_localNotificationsInitialized) {
      return;
    }

    const androidInitializationSettings = AndroidInitializationSettings(
      '@mipmap/ic_launcher',
    );

    const darwinInitializationSettings =
        DarwinInitializationSettings();

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
      debugPrint(
        'PUSH: Lokaler High-Importance-Channel initialisiert.',
      );
    }
  }

  void _initializeListeners() {
    if (_listenersInitialized) {
      return;
    }

    /*
     * Nachricht trifft ein, während Dipera geöffnet ist.
     */
    _foregroundSubscription =
        FirebaseMessaging.onMessage.listen(
      (RemoteMessage message) async {
        if (kDebugMode) {
          debugPrint(
            'PUSH: Nachricht im Vordergrund erhalten.',
          );
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
      },
    );

    /*
     * Firebase kann Tokens erneuern.
     */
    _tokenRefreshSubscription =
        _messaging.onTokenRefresh.listen(
      (String newToken) async {
        try {
          await _saveToken(newToken);

          if (kDebugMode) {
            debugPrint(
              'PUSH: Aktualisierter FCM-Token gespeichert.',
            );
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
      },
    );

    /*
     * Nachricht wurde angeklickt,
     * während App im Hintergrund war.
     */
    FirebaseMessaging.onMessageOpenedApp.listen(
      (RemoteMessage message) {
        if (kDebugMode) {
          debugPrint(
            'PUSH: Benachrichtigung wurde geöffnet.',
          );
        }

        /*
         * Hier können wir später navigieren:
         *
         * type = shift      -> Schichten
         * type = document   -> Dokumente
         * type = absence    -> Abwesenheiten
         */
      },
    );

    _listenersInitialized = true;
  }

  Future<void> _showForegroundNotification(
    RemoteMessage message,
  ) async {
    final notification = message.notification;

    final title =
        notification?.title ??
        message.data['title'] ??
        'Dipera';

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

    const notificationDetails =
        NotificationDetails(android: androidDetails);

    final notificationId =
        DateTime.now().millisecondsSinceEpoch.remainder(
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
      debugPrint(
        'PUSH: Vordergrund-Banner angezeigt.',
      );
    }
  }

  void _handleNotificationTap(
    NotificationResponse response,
  ) {
    if (kDebugMode) {
      debugPrint(
        'PUSH: Lokale Benachrichtigung geöffnet.',
      );
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
      throw StateError(
        'Kein angemeldeter Benutzer vorhanden.',
      );
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
      params: {
        'p_fcm_token': token,
        'p_platform': platform,
      },
    );
  }

  Future<void> unregisterCurrentDevice() async {
    try {
      final token = await _messaging.getToken();

      if (token == null || token.isEmpty) {
        return;
      }

      if (_client.auth.currentUser == null) {
        return;
      }

      await _client.rpc(
        'unregister_my_push_device',
        params: {
          'p_fcm_token': token,
        },
      );

      if (kDebugMode) {
        debugPrint(
          'PUSH: Gerät wurde deregistriert.',
        );
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