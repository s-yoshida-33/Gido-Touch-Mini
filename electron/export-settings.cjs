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
    
    // mallSettings.mallId が存在する場合はそれを使用し、なければルートの mallId を使用、それもなければデフォルト('suzaka')
    const currentMallId = (parsed.mallSettings && parsed.mallSettings.mallId) || parsed.mallId || 'suzaka';

    // dataByMall を取得
    const dataByMall = parsed.dataByMall || {};

    // ルートに shopPositions/pictoSettings が存在する場合のみ、dataByMall にマージする
    // (通常、main.cjs はルートのプロパティを削除して保存するため、ここは undefined になるはずです。
    //  以前のコードでは、ここが無条件に空オブジェクトで上書きしていたため、dataByMall 内の保存済みデータが消えていました)
    if (parsed.shopPositions) {
        if (!dataByMall[currentMallId]) dataByMall[currentMallId] = {};
        dataByMall[currentMallId].shopPositions = parsed.shopPositions;
    }
    if (parsed.pictoSettings) {
        if (!dataByMall[currentMallId]) dataByMall[currentMallId] = {};
        dataByMall[currentMallId].pictoSettings = parsed.pictoSettings;
    }
    if (parsed.locationIcons) {
        if (!dataByMall[currentMallId]) dataByMall[currentMallId] = {};
        dataByMall[currentMallId].locationIcons = parsed.locationIcons;
    }

    // モールごとにファイルを出力
    console.log('--- モール別初期設定のエクスポート ---');
    Object.keys(dataByMall).forEach(mallId => {
        // Sanitize before export to prevent recursion
        // shopPositions
        if (dataByMall[mallId].shopPositions) {
            const cleanPositions = {
                positions: dataByMall[mallId].shopPositions.positions || {}
            };
            dataByMall[mallId].shopPositions = cleanPositions;
        }
        
        // pictoSettings
        if (dataByMall[mallId].pictoSettings) {
            const cleanInstances = {
                instances: dataByMall[mallId].pictoSettings.instances || {}
            };
            dataByMall[mallId].pictoSettings = cleanInstances;
        }

        // locationIcons (optional sanitize if needed, currently just passing through)
        // No strict structure enforcement needed here as it's just copying what's in memory/file

        // 命名規則: default-[mallId]-data.json
        const fileName = `default-${mallId}-data.json`;
        const filePath = path.join(__dirname, fileName);
        
        fs.writeFileSync(
            filePath,
            JSON.stringify(dataByMall[mallId], null, 2),
            'utf-8'
        );
        console.log(`エクスポート完了: ${fileName}`);
        console.log(`  - Shop Positions: ${Object.keys(dataByMall[mallId].shopPositions?.positions || {}).length}`);
        console.log(`  - Picto Instances: ${Object.keys(dataByMall[mallId].pictoSettings?.instances || {}).length}`);
        console.log(`  - Location Icons: ${dataByMall[mallId].locationIcons ? 'Present' : 'None'}`);
    });

  } catch (error) {
    console.error('エクスポートに失敗しました:', error);
    process.exit(1);
  }
}

exportSettings();


