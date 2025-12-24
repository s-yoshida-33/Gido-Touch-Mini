// electron/preload.cjs
// Preload script for Electron

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('updater', {
  onStatus(callback) {
    ipcRenderer.on('update-status', (_event, data) => callback(data));
  },
  onProgress(callback) {
    ipcRenderer.on('update-progress', (_event, data) => callback(data));
  },
  checkForUpdatesReady() {
    ipcRenderer.send('check-for-updates-ready');
  },
  startupWaitCompleted() {
    ipcRenderer.send('startup-wait-completed');
  },
});

contextBridge.exposeInMainWorld('appInfo', {
  getVersion() {
    return ipcRenderer.invoke('get-app-version');
  },
  getLatestVersionInfo() {
    return ipcRenderer.invoke('get-latest-version-info');
  },
});

contextBridge.exposeInMainWorld('electronAPI', {
  // DEBUG API
  getDebugSettingsStatus() {
    return ipcRenderer.invoke('debug:get-settings-status');
  },
  getBridgeBaseUrl() {
    return ipcRenderer.invoke('get-bridge-base-url');
  },
  getFloor() {
    return ipcRenderer.invoke('settings:get-floor');
  },
  setFloor(floor) {
    ipcRenderer.send('menu:set-floor', floor);
  },
  onFloorChanged(callback) {
    ipcRenderer.on('settings:floor-changed', (_event, floor) => {
      callback(floor);
    });
  },
  getLocationIconSettings() {
    return ipcRenderer.invoke('get-location-icon-settings');
  },
  saveLocationIconSettings(settings) {
    return ipcRenderer.invoke('save-location-icon-settings', settings);
  },
  onLocationIconSettingsUpdated(callback) {
    const listener = (_event, updated) => callback(updated);
    ipcRenderer.on('location-icon-settings-updated', listener);

    return () => {
      ipcRenderer.removeListener('location-icon-settings-updated', listener);
    };
  },
  onOpenLocationIconSettings(callback) {
    const listener = () => callback();
    ipcRenderer.on('open-location-icon-settings', listener);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('open-location-icon-settings', listener);
    };
  },
  onOpenFloorSettings(callback) {
    const listener = () => callback();
    ipcRenderer.on('open-floor-settings', listener);

    return () => {
      ipcRenderer.removeListener('open-floor-settings', listener);
    };
  },
  onOpenVersionInfo(callback) {
    const listener = () => callback();
    ipcRenderer.on('open-version-info', listener);

    return () => {
      ipcRenderer.removeListener('open-version-info', listener);
    };
  },
  onOpenSettings(callback) {
    const listener = () => callback();
    ipcRenderer.on('open-settings', listener);

    return () => {
      ipcRenderer.removeListener('open-settings', listener);
    };
  },
  getImageSettings() {
    return ipcRenderer.invoke('get-image-settings');
  },
  saveImageSettings(settings) {
    return ipcRenderer.invoke('save-image-settings', settings);
  },
  onImageSettingsUpdated(callback) {
    const listener = (_event, updated) => callback(updated);
    ipcRenderer.on('image-settings-updated', listener);

    return () => {
      ipcRenderer.removeListener('image-settings-updated', listener);
    };
  },
  manualUpdateCheck() {
    ipcRenderer.send('menu:check-updates');
  },
  oneClickUpdate() {
    ipcRenderer.send('menu:one-click-update');
  },
  quitApp() {
    ipcRenderer.send('menu:quit');
  },
  getShopImage(filePath) {
    return ipcRenderer.invoke('get-shop-image', filePath);
  },
  getShopPositions() {
    return ipcRenderer.invoke('get-shop-positions');
  },
  saveShopPositions(settings) {
    return ipcRenderer.invoke('save-shop-positions', settings);
  },
  onShopPositionsUpdated(callback) {
    const listener = (_event, updated) => callback(updated);
    ipcRenderer.on('shop-positions-updated', listener);

    return () => {
      ipcRenderer.removeListener('shop-positions-updated', listener);
    };
  },
  getPictoSettings() {
    return ipcRenderer.invoke('get-picto-settings');
  },
  savePictoSettings(settings) {
    return ipcRenderer.invoke('save-picto-settings', settings);
  },
  onPictoSettingsUpdated(callback) {
    const listener = (_event, updated) => callback(updated);
    ipcRenderer.on('picto-settings-updated', listener);

    return () => {
      ipcRenderer.removeListener('picto-settings-updated', listener);
    };
  },
  getMallId() {
    return ipcRenderer.invoke('get-mall-id');
  },
  setMallId(mallId) {
    return ipcRenderer.invoke('set-mall-id', mallId);
  },
  readMallConfig(mallId, configType) {
    return ipcRenderer.invoke('read-mall-config', mallId, configType);
  },
  readMallAsset(relativePath) {
    return ipcRenderer.invoke('read-mall-asset', relativePath);
  },
});

contextBridge.exposeInMainWorld('logger', {
  log(level, message, context) {
    // Basic safeguard so the app does not crash even if called incorrectly
    ipcRenderer.send('log-message', {
      level,
      message,
      context: context || {},
    });
  },
  info(message, context) {
    this.log('info', message, context);
  },
  warn(message, context) {
    this.log('warn', message, context);
  },
  error(message, context) {
    this.log('error', message, context);
  },
  debug(message, context) {
    this.log('debug', message, context);
  },
});
