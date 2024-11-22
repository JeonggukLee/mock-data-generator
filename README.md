# ツール概要
本GUIツールは、**DDL**が記載された**SQL**ファイルを読み込んでカラムに合わせてMockデータを生成し、INSERT と UPDATE のクエリを生成する。

## ビルドについて
[Fyne](https://docs.fyne.io/)の`fyny-cross`を使って実行フラットフォームに合わせ実行ファイルをビルドする。
詳細は[クロスビルドについて](cross-build-memo.md)を参照

## 実行方法
- Windows : Windows用のビルドができたら、`fyne-cross/dist/windows-arm64/mockGenerator-win.zip`を解答を実施し、ルード直下の`runGenerator-windows.bat`を実行。
- Mac(Drawin) ：`runGenerator-darwin.sh`を実行。