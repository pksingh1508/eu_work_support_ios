const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "# Raise pod deployment targets to the app's minimum.";

module.exports = function withPodDeploymentTarget(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let contents = fs.readFileSync(podfilePath, "utf8");

      if (contents.includes(MARKER)) {
        return config;
      }

      // Xcode 27 rejects pod targets below iOS 15 (AppAuth, GoogleSignIn,
      // RevenueCat and friends still declare 9.0-13.0).
      const insertion = [
        "",
        `    ${MARKER}`,
        "    installer.pods_project.targets.each do |target|",
        "      target.build_configurations.each do |build_config|",
        "        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']",
        "        if current.nil? || Gem::Version.new(current) < Gem::Version.new(podfile_properties['ios.deploymentTarget'] || '15.1')",
        "          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = podfile_properties['ios.deploymentTarget'] || '15.1'",
        "        end",
        "      end",
        "    end",
      ].join("\n");

      contents = contents.replace(
        /(\n\s*react_native_post_install\([\s\S]*?\n\s*\)\n)/,
        `$1${insertion}\n`,
      );
      fs.writeFileSync(podfilePath, contents);

      return config;
    },
  ]);
};
