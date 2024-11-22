# cross build
本プロジェクトは[Fyne](https://docs.fyne.io/)を利用してGUIを構築したため、通常の `go build` コマンドでのクロスビルドはできない。

## 前提 ビルド環境
- Go言語のインストールができていて `$GO_PATH/bin` のパスが環境変数 `$PATH` に正しく設定できていること。
- FyneのPackageのインストール
  
  プロジェクトのルートで以下のPackageインストールコマンドを実行

```bash
$ go install fyne.io/fyne/v2/cmd/fyne@latest
```

- クロスフラットフォームへのビルド時の準備

  プロジェクトのルートで以下のPackageインストールコマンドを実行
```bash
$ go install github.com/fyne-io/fyne-cross@latest
```

## クロスビルド
`fyne-cross` を利用したビルドには、`--app-id` の指定が必要である。`--app-id` は次の例のようにドメイン形式の識別IDである。

    co.jp.flect.mockGenerator

### ビルド（実行ファイル生成）
`$GO_PATH/bin` のパスが通っていない場合、`fyne-cross` コマンドが見つからないとのエラーが表示されるので注意。

#### Windows用 
```bash
$ fyne-cross windows -output mockGenerator-win --app-id {co.jp.flect.mockGenerator}
```

#### Mac(Drawin)用
```bash
$ fyne-cross darwin -output mockGenerator-darwin --app-id {co.jp.flect.mockGenerator}
```