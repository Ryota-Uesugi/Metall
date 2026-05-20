# Boxyh / Metall-forge 開発・改修ガイドライン

本ドキュメントは、React + TypeScript + Electronを用いたソフトウェア設計ソフト兼新言語「Boxyh (Metall-forge)」の内部構造と、今後の改修・機能拡張時の指針をまとめたものです。

## 1. ディレクトリとファイル構成

現在のプロジェクトは、「状態管理」「ビジネスロジック」「UI（描画・イベント）」の責務を分離したアーキテクチャを採用しています。

```text
src/
 ├── App.tsx                     # アプリケーションのエントリポイント（レイアウト統括）
 ├── constants.ts                # 定数定義（型オプション、エッジの役割、属性リストなど）
 │
 ├── model/                      # データ構造と型定義（ドメインモデル）
 │    ├── graphTypes.ts          # ノード、エッジ、属性などの基本型定義（最重要ファイル）
 │    ├── attributeSchema.ts     # 各属性（@）が持つパラメータの入力フォーム定義
 │    └── attributeFormat.ts     # 属性を文字列として描画・コード生成するためのフォーマット処理
 │
 ├── hooks/                      # 状態管理とビジネスロジック
 │    ├── useGraphState.ts       # グラフの純粋な状態（nodes, edges）と更新関数を保持
 │    ├── useSelection.ts        # ノードやエッジの「選択状態」を管理
 │    ├── useGraphAutomations.ts # 【ドメインロジック】@Instanceの自動付与やペトリネットの型同期
 │    ├── useGraphView.ts        # 【ビューロジック】深度計算(BFS)、依存関係非表示、エラー判定
 │    ├── useCanvasInteraction.ts# 【イベント】キャンバスのパン、ズーム、ドラッグ、結線ロジック
 │    ├── usePropertyPanelLogic.ts# プロパティパネル用のデータ整形・取得ロジック
 │    └── useAppLogic.ts         # 上記のフックを束ねるファサード（窓口）。イベントと状態を繋ぐ
 │
 ├── components/                 # UIコンポーネント（見た目とユーザー操作）
 │    ├── Sidebar.tsx            # 左側メニュー（ノード追加、保存/読込、コード生成）
 │    ├── CustomFlowCanvas.tsx   # 中央キャンバス（背景、エッジの描画、全体配置）
 │    ├── CustomNodeUI.tsx       # ノード単体の見た目（Class, Method, Place, Transition等）
 │    ├── CodePreviewModal.tsx   # 生成されたコードのプレビュー画面
 │    │
 │    └── property/              # プロパティパネル関連
 │         ├── PropertyPanel.tsx    # 右側パネルの統括コンポーネント
 │         ├── MethodArgsEditor.tsx # メソッドの引数編集に特化したUI
 │         └── AttributeEditor.tsx  # 属性（@）の追加・編集に特化したUI
 │
 └── utils/                      # 状態を持たない純粋な関数群
      ├── graphUtils.ts          # ノードの絶対座標計算など、グラフ数学的ロジック
      ├── edgeStyle.ts           # エッジの役割やエラー状態に応じた色・スタイルの算出
      ├── codeGenerator.ts       # ノード/エッジ情報からBoxyh言語のソースコードを生成
      ├── projectIO.ts           # JSONのシリアライズ/デシリアライズ
      └── fileManager.ts         # ファイルの保存・読み込み処理（Electron/ブラウザAPI）