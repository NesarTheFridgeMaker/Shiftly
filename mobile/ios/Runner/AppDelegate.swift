
import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {

  private var apnsRegistrationState = "not_requested"
  private var apnsRegistrationError: String?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {

    let result = super.application(
      application,
      didFinishLaunchingWithOptions: launchOptions
    )

    apnsRegistrationState = "requested"
    apnsRegistrationError = nil

    DispatchQueue.main.async {
      NSLog("DIPERA APNS: Registrierung wird angefordert")
      application.registerForRemoteNotifications()
    }

    return result
  }

  func didInitializeImplicitFlutterEngine(
    _ engineBridge: FlutterImplicitEngineBridge
  ) {
    GeneratedPluginRegistrant.register(
      with: engineBridge.pluginRegistry
    )

    guard let registrar = engineBridge.pluginRegistry.registrar(
      forPlugin: "DiperaAPNsDiagnostics"
    ) else {
      NSLog("DIPERA APNS: Channel-Registrar nicht verfügbar")
      return
    }

    let channel = FlutterMethodChannel(
      name: "app.dipera.mobile/apns_diagnostics",
      binaryMessenger: registrar.messenger()
    )

    channel.setMethodCallHandler { [weak self] call, result in
      guard call.method == "getRegistrationStatus" else {
        result(FlutterMethodNotImplemented)
        return
      }

      guard let self = self else {
        result([
          "state": "unavailable",
          "error": ""
        ])
        return
      }

      result([
        "state": self.apnsRegistrationState,
        "error": self.apnsRegistrationError ?? ""
      ])
    }
  }

  override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    apnsRegistrationState = "success"
    apnsRegistrationError = nil

    NSLog(
      "DIPERA APNS: Registrierung erfolgreich (%ld Bytes)",
      deviceToken.count
    )

    super.application(
      application,
      didRegisterForRemoteNotificationsWithDeviceToken: deviceToken
    )
  }

  override func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    apnsRegistrationState = "failure"

    let nsError = error as NSError
    apnsRegistrationError = "\(nsError.domain) (\(nsError.code))"

    NSLog(
      "DIPERA APNS: Registrierung fehlgeschlagen: %@",
      error.localizedDescription
    )

    super.application(
      application,
      didFailToRegisterForRemoteNotificationsWithError: error
    )
  }
}
