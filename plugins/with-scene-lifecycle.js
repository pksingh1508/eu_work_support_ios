const { withAppDelegate, withInfoPlist } = require("@expo/config-plugins");

// iOS 27 traps at launch (_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption)
// when an app built with the iOS 27 SDK still uses the window-only app lifecycle.
// Expo SDK 55's AppDelegate template creates its window in didFinishLaunching, so
// move window creation into a UIWindowSceneDelegate.

const MARKER = "// [with-scene-lifecycle]";

const WINDOW_BLOCK = /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif\n/;

const SCENE_CONFIG = `
  ${MARKER}
  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }
`;

const SCENE_DELEGATE = `
${MARKER}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else {
      return
    }

    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)

    if let userActivity = connectionOptions.userActivities.first {
      self.scene(scene, continue: userActivity)
    }
  }

  // Linking API
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    for context in URLContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
      if let sourceApplication = context.options.sourceApplication {
        options[.sourceApplication] = sourceApplication
      }
      options[.openInPlace] = context.options.openInPlace
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: options)
    }
  }

  // Universal Links
  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = appDelegate.application(UIApplication.shared, continue: userActivity) { _ in }
  }
}
`;

function withSceneDelegate(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== "swift") {
      throw new Error("with-scene-lifecycle only supports a Swift AppDelegate");
    }

    let contents = config.modResults.contents;
    if (contents.includes(MARKER)) {
      return config;
    }

    if (!WINDOW_BLOCK.test(contents)) {
      throw new Error("with-scene-lifecycle: AppDelegate window setup not found; update the plugin");
    }

    contents = contents.replace(WINDOW_BLOCK, "");
    contents = contents.replace(
      /(\n  \/\/ Linking API\n)/,
      `${SCENE_CONFIG}$1`,
    );
    contents = contents.replace(
      /(\nclass ReactNativeDelegate: ExpoReactNativeFactoryDelegate)/,
      `${SCENE_DELEGATE}$1`,
    );

    config.modResults.contents = contents;
    return config;
  });
}

function withSceneManifest(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return config;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneManifest(withSceneDelegate(config));
};
