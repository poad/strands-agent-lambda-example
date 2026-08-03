# Strands Agent Lambda Example

AWS Lambda上で動作するStrands Agentのサンプル実装です。AWSのアーキテクチャ設計を支援するAIエージェントを、サーバーレス環境で実行します。

## 概要

このプロジェクトは、Strands Agents SDKを使用してAWSの知識を持つAIエージェントを構築し、AWS Lambda + Function URLとしてデプロイするサンプルです。

### 主な機能

- **Strands Agents SDK** を使用したエージェント実装
- **Amazon Bedrock** (Nova Micro等) をLLMとして使用
- **AWS Lambda** (Node.js 24.x, ARM64) 上でストリーミング実行
- **Lambda Function URL** (Response Streaming) によるHTTPSエンドポイント公開
- **OpenTelemetry** による分散トレーシング・メトリクス収集
- **AWS CDK** によるインフラコード管理
- **GitHub Actions** によるCI/CDパイプライン

## プロジェクト構成

```plaintext
strands-agent-example/
├── agent/                      # Strands Agent Lambda関数
│   ├── bin/cdk.ts             # CDKアプリエントリーポイント
│   ├── lib/cdk-stack.ts       # Lambda + Function URL スタック
│   ├── lambda/
│   │   ├── index.ts           # Lambda ハンドラ (ストリーミング)
│   │   ├── agent.ts           # エージェント定義・初期化
│   │   ├── tools/aws-tool.ts  # AWS知識取得ツール (MCPクライアント)
│   │   ├── logger.ts          # 構造化ログ (Powertools)
│   │   └── observability/     # OpenTelemetry設定
│   ├── test/                  # テスト
│   └── package.json
├── deploy-role/               # GitHub Actionsデプロイ用IAMロール
│   ├── lib/deploy-role-stack.ts
│   └── package.json
├── .github/workflows/         # CI/CDワークフロー
│   ├── ci.yml                # Lint/TypeCheck/Test
│   ├── deploy.yml            # デプロイ
│   ├── auto-merge.yml        # 自動マージ
│   └── codeql-analysis.yml   # セキュリティスキャン
├── pnpm-workspace.yaml        # pnpmワークスペース設定
└── package.json               # ルートパッケージ
```

## アーキテクチャ

```plaintext
┌─────────────┐     HTTPS      ┌──────────────────────┐
│   Client    │ ──────────────▶ │ Lambda Function URL  │
└─────────────┘  (Streaming)   │  (Response Stream)   │
                                └──────────┬───────────┘
                                           │
                                ┌──────────▼───────────┐
                                │  Strands Agent       │
                                │  - BedrockModel      │
                                │  - AWS Tool (MCP)    │
                                │  - System Prompt     │
                                └──────────┬───────────┘
                                           │
                                ┌──────────▼───────────┐
                                │  Amazon Bedrock      │
                                │  (Nova Micro, etc.)  │
                                └──────────┬───────────┘
                                           │
                                ┌──────────▼───────────┐
                                │  aws-knowledge-      │
                                │  mcp-server          │
                                └──────────────────────┘
```

## 前提条件

- Node.js 24.x
- pnpm 11.x
- AWS CLI 設定済み
- AWS CDK インストール済み (`pnpm -w add -g aws-cdk`)
- GitHub OIDCプロバイダー設定済み (デプロイ用)

## セットアップ

```bash
# 依存関係インストール
pnpm install

# ビルド
pnpm -r build

# テスト実行
pnpm -r test

# Lint実行
pnpm lint
pnpm lint-fix
```

## デプロイ

### 1. デプロイ用IAMロール作成 (初回のみ)

```bash
cd deploy-role
pnpm build
cdk deploy --profile <your-profile>
```

### 2. Agentスタックデプロイ

```bash
cd agent
pnpm build
cdk deploy \
  -c databricks-workspace-url=<url> \
  -c databricks-oauth-client-id=<id> \
  -c databricks-oauth-client-secret=<secret> \
  -c databricks-uc-schema-name=<schema> \
  -c databricks-uc-table-prefix=<prefix> \
  --profile <your-profile>
```

### 必要なCDK Contextパラメータ

| パラメータ | 説明 | 必須 |
| -------- | ---- | --- |
| `databricks-workspace-url` | DatabricksワークスペースURL | Yes |
| `databricks-oauth-client-id` | OAuth クライアントID | Yes |
| `databricks-oauth-client-secret` | OAuth クライアントシークレット | Yes |
| `databricks-uc-schema-name` | Unity Catalogスキーマ名 | Yes |
| `databricks-uc-table-prefix` | テーブルプレフィックス | Yes |

## 使用方法

デプロイ後、Function URLエンドポイントにPOSTリクエストを送信:

```bash
curl -X POST https://<function-url>.lambda-url.<region>.on.aws/ \
  -H "Content-Type: application/json" \
  -d '{
    "message": "S3とLambdaでサーバーレス画像処理パイプラインを作りたい",
    "model": "us.amazon.nova-micro-v1:0",
    "session": "session-123"
  }'
```

### レスポンス (ストリーミング)

```plaintext
S3とLambdaを使用したサーバーレス画像処理パイプラインのアーキテクチャを提案します。

## パターン1: 基本構成
...
```

## 環境変数

| 変数名 | 説明 | デフォルト |
| -------- | ------ | ------------ |
| `DATABRICKS_WORKSPACE_URL` | DatabricksワークスペースURL | - |
| `DATABRICKS_OAUTH_CLIENT_ID` | OAuth クライアントID | - |
| `DATABRICKS_OAUTH_CLIENT_SECRET` | OAuth クライアントシークレット | - |
| `DATABRICKS_UC_SCHEMA_NAME` | Unity Catalogスキーマ名 | - |
| `DATABRICKS_UC_TABLE_PREFIX` | テーブルプレフィックス | - |
| `ENABLE_TRACING` | トレーシング有効化 | `true` |
| `OTEL_SEMCONV_STABILITY_OPT_IN` | OpenTelemetry安定化オプトイン | `gen_ai_latest_experimental,gen_ai_tool_definitions` |

## 開発

### ローカル開発

```bash
# Agentパッケージでファイル監視ビルド
cd agent && pnpm watch

# 別ターミナルでテスト実行
cd agent && pnpm test
```

### 観測性

- **ログ**: CloudWatch Logs (`/aws/lambda/<function-name>`)
- **トレース**: OTLPエンドポイントへエクスポート (設定による)
- **メトリクス**: OpenTelemetry SDK経由で収集

## CI/CD

GitHub Actionsワークフロー:

| ワークフロー | トリガー | 内容 |
| ---------- | ------- | ---- |
| `ci.yml` | PR/Push | Lint, TypeCheck, Test |
| `deploy.yml` | mainブランチPush | CDKデプロイ |
| `auto-merge.yml` | PR承認 | 依存関係PR自動マージ |
| `codeql-analysis.yml` | 週次/Push | セキュリティスキャン |

## ライセンス

ISC
