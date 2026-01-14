// すべてのアセットを一括読み込み
// キーはファイルパス、値はModule（defaultにURLが入っている）
// ../assets/malls/**/*.svg と ../assets/common/**/*.svg を両方カバーするために ../assets/**/*.svg とする
const assetModules = import.meta.glob('../assets/**/*.svg', { eager: true, query: '?url' });

export function getAssetUrl(path: string): string {
  // pathは assets/ 以下からの相対パスなどを想定
  // 例: malls/suzaka/maps/1F.svg -> ../assets/malls/suzaka/maps/1F.svg
  // 例: common/search.svg -> ../assets/common/search.svg
  const fullPath = `../assets/${path}`;
  const module = assetModules[fullPath] as { default: string } | undefined;
  
  if (!module) {
      if (import.meta.env.DEV) {
          console.warn(`[getAssetUrl] Asset not found in glob: ${fullPath}`);
      }
      return "";
  }
  return module.default;
}

export function getMallAssetUrl(mallId: string, category: string, filename: string): string {
  // category: "maps", "genres/ja", "pictos" など
  return getAssetUrl(`malls/${mallId}/${category}/${filename}`);
}

export function getCommonAssetUrl(filename: string): string {
  // commonフォルダ直下のファイルを取得
  // 例: search.svg, time.svg
  return getAssetUrl(`common/${filename}`);
}

// ピクト一覧取得用
// 指定されたモール・カテゴリ内のファイルパス一覧を返す
export function getMallAssetPaths(mallId: string, category: string): string[] {
    const prefix = `../assets/malls/${mallId}/${category}/`;
    // console.log(`getMallAssetPaths: searching for prefix ${prefix}`); // DEBUG
    return Object.keys(assetModules)
        .filter(path => path.startsWith(prefix))
        .map(path => path.replace(prefix, '')); // ファイル名のみ返す
}

// ファイル名からモール内のピクト画像URLを探す
export function findMallPictoUrl(mallId: string, filename: string): string {
    // ファイル名からサブディレクトリを抽出（例: "ja/restroom.svg" -> "ja", "restroom.svg"）
    const parts = filename.split('/');
    const hasSubDir = parts.length > 1;
    const baseFilename = hasSubDir ? parts[parts.length - 1] : filename;
    const subDir = hasSubDir ? parts.slice(0, -1).join('/') : null;
    
    // CamelCase to KebabCase conversion (e.g. freeCoinLocker -> free-coin-locker)
    const kebabName = baseFilename
        .replace(/\.svg$/i, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase() + '.svg';
    const kebabNameWithoutExt = kebabName.replace(/\.svg$/, '');
    
    // ファイル名を正規化（アンダースコアをハイフンに変換、拡張子を確保）
    const normalizedName = baseFilename.replace(/_/g, '-');
    const nameWithoutExt = normalizedName.replace(/\.svg$/, '');
    const nameWithExt = nameWithoutExt + '.svg';
    
    // 検索パターンのリスト
    const searchPatterns: string[] = [];
    
    // サブディレクトリが指定されている場合
    if (subDir) {
        // 元のファイル名そのまま
        searchPatterns.push(`../assets/malls/${mallId}/pictos/${subDir}/${baseFilename}`);
        // 正規化したファイル名
        if (normalizedName !== baseFilename) {
            searchPatterns.push(`../assets/malls/${mallId}/pictos/${subDir}/${nameWithExt}`);
        }
        // Kebab case
        if (kebabName !== baseFilename && kebabName !== normalizedName) {
            searchPatterns.push(`../assets/malls/${mallId}/pictos/${subDir}/${kebabName}`);
        }
    }
    
    // 1. 直下（pictos/）- アイコン用、最優先
    // NEW: pictos/icon フォルダを最優先に追加
    searchPatterns.push(`../assets/malls/${mallId}/pictos/icon/${baseFilename}`);
    if (normalizedName !== baseFilename) {
        searchPatterns.push(`../assets/malls/${mallId}/pictos/icon/${nameWithExt}`);
    }
    if (kebabName !== baseFilename && kebabName !== normalizedName) {
        searchPatterns.push(`../assets/malls/${mallId}/pictos/icon/${kebabName}`);
    }

    // 2. 直下（pictos/）- 旧構造互換
    searchPatterns.push(`../assets/malls/${mallId}/pictos/${baseFilename}`);
    if (normalizedName !== baseFilename) {
        searchPatterns.push(`../assets/malls/${mallId}/pictos/${nameWithExt}`);
    }
    if (kebabName !== baseFilename && kebabName !== normalizedName) {
        searchPatterns.push(`../assets/malls/${mallId}/pictos/${kebabName}`);
    }
    
    // 2. ja/ フォルダ - ボタン用
    searchPatterns.push(`../assets/malls/${mallId}/pictos/ja/${baseFilename}`);
    if (normalizedName !== baseFilename) {
        searchPatterns.push(`../assets/malls/${mallId}/pictos/ja/${nameWithExt}`);
    }
    if (kebabName !== baseFilename && kebabName !== normalizedName) {
        searchPatterns.push(`../assets/malls/${mallId}/pictos/ja/${kebabName}`);
    }
    
    // 3. en/ フォルダ - ボタン用
    searchPatterns.push(`../assets/malls/${mallId}/pictos/en/${baseFilename}`);
    if (normalizedName !== baseFilename) {
        searchPatterns.push(`../assets/malls/${mallId}/pictos/en/${nameWithExt}`);
    }
    if (kebabName !== baseFilename && kebabName !== normalizedName) {
        searchPatterns.push(`../assets/malls/${mallId}/pictos/en/${kebabName}`);
    }
    
    // 各パターンを試す
    for (const path of searchPatterns) {
        if (assetModules[path]) {
            return (assetModules[path] as { default: string }).default;
        }
    }
    
    // 追加のフォールバック: 単数形/複数形の違いを考慮（例: free-coin-locker vs free-coin-lockers）
    const namesToTry = [nameWithoutExt, kebabNameWithoutExt];
    if (normalizedName !== baseFilename && normalizedName !== kebabName) {
        namesToTry.push(normalizedName.replace(/\.svg$/, ''));
    }
    
    // 末尾が "s" の場合、削除して試す
    for (const name of namesToTry) {
        if (name.endsWith('s') && name.length > 1) {
            const singularName = name.slice(0, -1) + '.svg';
            const fallbackPatterns = [
                `../assets/malls/${mallId}/pictos/${singularName}`,
                `../assets/malls/${mallId}/pictos/ja/${singularName}`,
                `../assets/malls/${mallId}/pictos/en/${singularName}`,
            ];
            for (const path of fallbackPatterns) {
                if (assetModules[path]) {
                    return (assetModules[path] as { default: string }).default;
                }
            }
        }
    }
    
    // 末尾に "s" を追加して試す
    for (const name of namesToTry) {
        if (!name.endsWith('s')) {
            const pluralName = name + 's.svg';
            const fallbackPatterns = [
                `../assets/malls/${mallId}/pictos/${pluralName}`,
                `../assets/malls/${mallId}/pictos/ja/${pluralName}`,
                `../assets/malls/${mallId}/pictos/en/${pluralName}`,
            ];
            for (const path of fallbackPatterns) {
                if (assetModules[path]) {
                    return (assetModules[path] as { default: string }).default;
                }
            }
        }
    }
    
    // デバッグ用：見つからなかった場合にログ出力（開発時のみ）
    if (import.meta.env.DEV) {
        const availablePictos = Object.keys(assetModules)
            .filter(p => p.includes(`malls/${mallId}/pictos`))
            .map(p => p.replace(`../assets/malls/${mallId}/pictos/`, ''))
            .filter(p => !p.includes('-highlight') && !p.includes('button-'));
        console.warn(`Picto icon not found: ${filename} for mall ${mallId}`, {
            baseFilename,
            normalizedName,
            kebabName,
            searchPatterns: searchPatterns.slice(0, 5),
            availablePictos: availablePictos.slice(0, 20)
        });
    }
    
    return "";
}

// 非同期読み込みヘルパー
export async function loadMallPictoConfig(mallId: string) {
  if (window.electronAPI?.readMallConfig) {
     return window.electronAPI.readMallConfig(mallId, 'pictos');
  }
  return null;
}

export async function loadMallGenreConfig(mallId: string) {
    if (window.electronAPI?.readMallConfig) {
        return window.electronAPI.readMallConfig(mallId, 'genres');
    }
    return null;
}

export async function loadPictoIcon(mallId: string, lang: string, name: string, isHighlight: boolean, isButton: boolean) {
    let filename = name;
    if (isHighlight) filename += '-highlight';
    if (!filename.endsWith('.svg')) filename += '.svg';
    
    // ピクトアイコンのパス構築ルール
    // ボタンの場合: pictos/{lang}/{filename}
    // アイコンの場合: pictos/{filename} (優先), pictos/ja/{filename} (フォールバック)
    
    if (window.electronAPI?.readMallAsset) {
        let path = '';
        if (isButton) {
            path = `${mallId}/pictos/${lang}/${filename}`;
            return await window.electronAPI.readMallAsset(path);
        } else {
            // アイコンの場合の優先順位
            // 1. icon/ フォルダ (マップ用アイコン) - Electron API
            let result = await window.electronAPI.readMallAsset(`${mallId}/pictos/icon/${filename}`);
            if (result) return result;
            
            // 1.1. icon/ フォルダ (マップ用アイコン) - Vite Asset Modules (Fallback)
            // Electron APIで読めない場合（パーミッションやパスの問題）でも、バンドルされたアセットがあればそれを使う
            const iconPath = `../assets/malls/${mallId}/pictos/icon/${filename}`;
            if (assetModules[iconPath]) {
                 return (assetModules[iconPath] as { default: string }).default;
            }

            // 1.5. icon/ フォルダでの単数形/複数形フォールバック
            // 設定上の名前と実際のファイル名で単数/複数が異なる場合に対応 (例: free-coin-locker <-> free-coin-lockers)
            let altFilename = '';
            if (filename.endsWith('s.svg')) {
                 // 複数形 -> 単数形
                 altFilename = filename.replace(/s\.svg$/, '.svg');
            } else {
                 // 単数形 -> 複数形
                 altFilename = filename.replace(/\.svg$/, 's.svg');
            }
            
            if (altFilename && altFilename !== filename) {
                 // Electron API
                 result = await window.electronAPI.readMallAsset(`${mallId}/pictos/icon/${altFilename}`);
                 if (result) return result;
                 
                 // Vite Asset Modules
                 const altIconPath = `../assets/malls/${mallId}/pictos/icon/${altFilename}`;
                 if (assetModules[altIconPath]) {
                      return (assetModules[altIconPath] as { default: string }).default;
                 }
            }

            // 2. 直下 (旧仕様)
            result = await window.electronAPI.readMallAsset(`${mallId}/pictos/${filename}`);
            if (result) return result;

            // 3. ja/ フォルダ (ボタン用をフォールバックとして使用)
            if (import.meta.env.DEV) console.log(`loadPictoIcon debug: fallback to lang folder ${lang} for ${filename}`);
            return await window.electronAPI.readMallAsset(`${mallId}/pictos/${lang}/${filename}`);
        }
    }
    
    // Electron環境でない場合のフォールバック（findMallPictoUrlを使用）
    // ボタンの場合は言語フォルダを考慮
    if (isButton) {
        return findMallPictoUrl(mallId, `${lang}/${filename}`);
    }
    return findMallPictoUrl(mallId, filename);
}

export async function loadGenreIcon(mallId: string, lang: string, name: string, isHighlight: boolean) {
     let filename = name.split('?')[0];
     
     if (isHighlight) {
        // 拡張子の前に -highlight を挿入
        const dotIndex = filename.lastIndexOf('.');
        if (dotIndex !== -1) {
            filename = filename.slice(0, dotIndex) + '-highlight' + filename.slice(dotIndex);
        } else {
            filename += '-highlight';
        }
     }
     
     if (!filename.endsWith('.svg')) filename += '.svg';
     
     const path = `${mallId}/genres/${lang}/${filename}`;
     
     if (window.electronAPI?.readMallAsset) {
         return await window.electronAPI.readMallAsset(path);
     }
     
     // Fallback
     return getMallAssetUrl(mallId, `genres/${lang}`, filename);
}

export async function loadOpenTimeImage(mallId: string, lang: string) {
    const filename = "open-time.svg";
    const safeMallId = mallId.trim();
    
    // 1. Try external file via Electron API
    if (window.electronAPI?.readMallAsset) {
        // Try English if lang is en
        if (lang === "en") {
            const path = `${safeMallId}/open-time/en/${filename}`;
            try {
                const result = await window.electronAPI.readMallAsset(path);
                if (result) return result;
            } catch (e) {
                console.warn(`[loadOpenTimeImage] Failed to read en asset: ${path}`, e);
            }
        }
        
        // Fallback to Japanese (or if lang is ja)
        const path = `${safeMallId}/open-time/ja/${filename}`;
        try {
            const result = await window.electronAPI.readMallAsset(path);
            if (result) return result;
        } catch (e) {
            console.warn(`[loadOpenTimeImage] Failed to read ja asset: ${path}`, e);
        }
    }
    
    console.warn(`[loadOpenTimeImage] Fallback to bundled assets for ${safeMallId} (${lang})`);

    // 2. Fallback to bundled assets
    // Electron APIでの読み込みが失敗した場合、Viteバンドルアセットを使用する
    if (lang === "en") {
        const enPath = getMallAssetUrl(safeMallId, "open-time/en", filename);
        // Viteバンドルにアセットが含まれているか確認（getMallAssetUrlは存在しない場合空文字を返すように修正済み）
        if (enPath) return enPath;
    }
    
    return getMallAssetUrl(safeMallId, "open-time/ja", filename);
}
