// electron/export-settings.cjs
// Devモードで設定した内容（店舗位置、ピクトグラムなど）をデフォルト設定ファイルとしてエクスポートするスクリプト

const fs = require('fs');
const path = require('path');
const os = require('os');

function getSettingsPath() {
  // ElectronのuserDataパスを取得（app.getPathを使わずに直接計算）
  const platform = process.platform;
  let userDataPath;
  
  if (platform === 'win32') {
    userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'gido-touch-mini');
  } else if (platform === 'darwin') {
    userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'gido-touch-mini');
  } else {
    userDataPath = path.join(os.homedir(), '.config', 'gido-touch-mini');
  }
  
  return path.join(userDataPath, 'settings.json');
}

function exportSettings() {
  try {
    // 設定ファイルのパスを取得
    const settingsPath = getSettingsPath();
    const defaultShopPositionsPath = path.join(__dirname, 'default-shop-positions.json');
    const defaultPictoSettingsPath = path.join(__dirname, 'default-picto-settings.json');
    
    if (!fs.existsSync(settingsPath)) {
      console.log('設定ファイルが見つかりません:', settingsPath);
      console.log('設定ファイルの場所を確認してください。');
      return;
    }
    
    // 設定ファイルを読み込む
    const raw = fs.readFileSync(settingsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    
    // 1. shopPositionsをエクスポート
    const shopPositions = parsed.shopPositions || { positions: {} };
    fs.writeFileSync(
      defaultShopPositionsPath,
      JSON.stringify(shopPositions, null, 2),
      'utf-8'
    );
    console.log('店舗位置設定をエクスポートしました:', defaultShopPositionsPath);
    console.log('  - 店舗数:', Object.keys(shopPositions.positions || {}).length);

    // 2. pictoSettingsをエクスポート
    const pictoSettings = parsed.pictoSettings || { instances: {} };
    fs.writeFileSync(
      defaultPictoSettingsPath,
      JSON.stringify(pictoSettings, null, 2),
      'utf-8'
    );
    console.log('ピクトグラム設定をエクスポートしました:', defaultPictoSettingsPath);
    console.log('  - インスタンス数:', Object.keys(pictoSettings.instances || {}).length);

  } catch (error) {
    console.error('エクスポートに失敗しました:', error);
    process.exit(1);
  }
}

exportSettings();


