import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // Create window with full screen bounds
    window = UIWindow(frame: UIScreen.main.bounds)
    
    // Ensure window is not nil before using it
    guard let window = window else {
      return false
    }
    
    // Make window key and visible for full screen
    window.makeKeyAndVisible()

    factory.startReactNative(
      withModuleName: "lecrepeApp",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
    // Always try local bundle first to avoid Metro connection issues
    // This prevents the "Connect to Metro" overlay from blocking interaction
    if let bundleURL = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
      return bundleURL
    }
    
    // Fallback to Metro only in DEBUG mode if bundle doesn't exist
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    // In RELEASE mode, bundle should always exist
    return nil
#endif
  }
}

