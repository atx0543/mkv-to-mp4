# 外部ソフトウェア

Web版は @ffmpeg/ffmpeg 0.12.15（MITライセンス）を使用します。ソース: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v12.15

変換時に jsDelivr から @ffmpeg/core 0.12.10 を取得します。コアはFFmpegおよび各ライブラリのライセンス（GPLを含む）に従います。コア本体をこのリポジトリには同梱していません。関連ソース・ビルド手順: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v0.12.10

パソコン版は別途インストールするNode.jsとFFmpegを使います。
