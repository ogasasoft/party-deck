# 広告・法務・プライバシー整理

確認日: 2026-06-05

## 方針

Party Deckは、ログイン、メールアドレス、電話番号、SNS連携、端末位置情報権限を使わない。プレイヤー情報はニックネームと担当色だけをブラウザlocalStorageに保存する。

広告は収益化の主軸にするが、秘密情報、回答中、投票中、受け渡し中には表示しない。広告SDKや広告ネットワーク側の処理が失敗してもゲーム進行を止めない。

## 広告ネットワーク

MVPの第一候補はGoogle AdSense。

理由:

- Webサイト向けの導入が軽い。
- Vercelの静的配信と相性がよい。
- まずディスプレイ広告で始めやすい。

実装状態:

- `src/core/adPolicy.ts` で広告を出してよい画面を制御している。
- `src/components/PartyScreens.tsx` の `AdSlot` は、`VITE_ADSENSE_CLIENT` と `VITE_ADSENSE_SLOT` が両方ある場合だけAdSense scriptを読み込む。
- 環境変数が空の場合は、従来通りの「広告エリア」プレースホルダーを表示する。
- script読み込みに失敗してもresolveして、ゲーム操作を止めない。
- `npm run audit:production:ads` は本番bundleにAdSense client idとslot idが入っているかを強制確認する。有効化前は失敗するのが正常。

本番でAdSenseを有効にする前に必要なもの:

- AdSense審査。
- publisher client id。
- ad slot id。
- `/privacy.html` と `/terms.html` の公開確認。
- 欧州経済領域、英国、スイスに広告配信する場合のGoogle認定CMP対応。
- Vercel本番環境へ `VITE_ADSENSE_CLIENT` と `VITE_ADSENSE_SLOT` を設定したあと、再デプロイして `npm run audit:production:ads` を通す。

## プライバシーポリシー

`public/privacy.html` を追加済み。公開後は `https://party-deck.vercel.app/privacy.html` で確認する。

記載していること:

- ログインや連絡先などの個人情報を取得しない。
- ニックネーム、色、ゲーム進行状態はlocalStorageに保存する。
- Mapillary画像、OpenStreetMap地図タイル取得時に外部通信が発生する。
- 将来広告を有効にした場合、広告配信事業者がCookie、端末情報、IPアドレスなどを使う可能性がある。
- 保存データの削除方法。

## 利用規約

`public/terms.html` を追加済み。公開後は `https://party-deck.vercel.app/terms.html` で確認する。

記載していること:

- 飲酒の強要、一気飲み、未成年飲酒、危険行為、参加強制を禁止する。
- 飲み会ゲームはソフトドリンクでも遊べる形へ置き換える。
- 本家ゲームの文章、画像、音声、カード文面、UIデザインを転載しない方針。
- MapillaryとOpenStreetMapのattributionを表示する。
- 外部サービスやブラウザ仕様によって動作が変わる可能性。

## Mapillary

現在の実装はMapillary Graph APIから画像URLと座標を取得し、静止画像として表示する。Mapillary画像のattributionリンクは消さない。

確認した公式情報:

- Mapillaryの画像はCC-BY-SAとして共有され、利用時にattributionが必要。
- MapillaryJSのattribution componentはdefault true。将来MapillaryJSへ切り替える場合もattributionを非表示にしない。
- MapillaryJS利用にはclient access tokenが必要。

## localStorage

AppleのWeb Storage documentationでは、ブラウザ固有のquota超過時に保存が例外を投げる可能性がある。Party Deckは保存データが小さいため、まず `npm run audit:storage` で現状データ量を監査する。

実装状態:

- `scripts/audit-local-storage.ts` を追加済み。
- 8人、全ゲームの代表sessionを保存した場合のJSONサイズを概算する。
- 保守的な目安として2MiB未満を合格にする。
- 2026-06-05の監査では9.68KiBで、2MiB予算の約0.47%だった。

## 参照

- Google Publisher Policies: https://support.google.com/adsense/answer/9335564
- Google AdSense Required content: https://support.google.com/adsense/answer/1348695
- Google EU user consent policy: https://support.google.com/adsense/answer/7670013
- Mapillary CC-BY-SA license for open data: https://help.mapillary.com/hc/en-us/articles/115001770409-CC-BY-SA-license-for-open-data
- MapillaryJS ComponentOptions attribution: https://mapillary.github.io/mapillary-js/api/interfaces/viewer.ComponentOptions/
- Apple Web Storage guide: https://developer.apple.com/library/archive/documentation/iPhone/Conceptual/SafariJSDatabaseGuide/Name-ValueStorage/Name-ValueStorage.html
