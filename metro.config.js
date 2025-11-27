const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

// Get the real path (resolve symlinks)
const projectRoot = fs.realpathSync(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  projectRoot: projectRoot,
  watchFolders: [projectRoot],
  resolver: {
    // Ensure we resolve from the actual project directory, not symlinks
    extraNodeModules: {},
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
