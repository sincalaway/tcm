# Vercel 迁移状态记录

## 2026-08-21：TiDB 环境变量识别

预览分支 `feat/vercel-fullstack-runtime` 已推送提交 `1042fc4` 并由 Vercel 成功部署。公开健康检查地址 `https://tcm-1sknia6y3-away6.vercel.app/api/health` 返回：

```json
{"ok":true,"runtime":"vercel","databaseConfigured":true,"oauthConfigured":false,"storageConfigured":false}
```

该结果证明 `DATABASE_URL` 已注入 Preview 运行时，但不代替一次实际的 TiDB `SELECT 1` 连接验证；后续将以无写入健康检查完成连接确认，然后再执行 schema 初始化与公开目录种子。

## 2026-08-21：实际连接验证

提交 `86ec529` 的 Preview `https://tcm-c1dk36msd-away6.vercel.app/api/health` 返回 `databaseConfigured: true` 但 `databaseReachable: false`。这表示变量已注入而连接未建立；在修复连接配置前，不会执行任何建表或公开目录种子操作。下一步仅检查 Vercel 运行日志中的通用错误类别（例如 TLS、认证或网络端点），不记录连接字符串内容。

运行日志已确认错误类别为 **TiDB Cloud 拒绝未加密连接**。应用将仅针对 `*.tidbcloud.com` 主机显式启用证书校验的 TLS；无需在聊天中提供或更改任何密码。

提交 `f9d0eae` 已完成 Vercel Preview 部署，但分支稳定域名的健康检查仍返回 `databaseReachable: false`。因此需要检查该次请求的运行日志，确认是连接字符串中的 TLS 参数覆盖了代码设置、TLS 握手失败，还是数据库凭据/端点选择错误；schema 迁移继续保持暂停。

TLS 已建立，但运行日志显示数据库认证被拒绝。因此 Vercel 中保存的连接字符串与 TiDB 当前凭据不匹配或未被安全编码；需要从 TiDB 的 Connect 页面重新复制当前 `tcm` 数据库的完整 General/Node.js 连接字符串，并在 Vercel 中覆盖 `DATABASE_URL`。健康检查日志已调整为不再输出底层驱动错误对象。

## 2026-08-21：TiDB 连接已验证

用户更新 TiDB 密码与 Vercel 的 `DATABASE_URL` 后，提交 `04584dd` 触发的新 Preview 已成功部署。稳定 Preview 域名的健康检查现返回 `databaseConfigured: true` 及 `databaseReachable: true`，证明 Serverless Runtime 能以 TLS 连接 TiDB 并完成只读 `SELECT 1`。数据库尚未初始化任何应用表或个人数据，下一步可以安全执行已审查的 schema 创建与公开目录种子。

## Schema 初始化策略

已审查仓库内的 `0000`—`0005` 六份 Drizzle SQL：它们仅包含建表、建索引及向知识库表添加正文列的操作，不含删除、截断或变更既有列类型的语句。Vercel 的 Preview 构建将先执行 `drizzle-kit migrate`，迁移记录写入 Drizzle 自身的迁移日志表，后续构建会幂等跳过已完成步骤。Drizzle Kit 亦将对 `*.tidbcloud.com` 连接显式使用 TLS 证书校验。

首次构建期迁移在约 20 秒的“applying migrations”状态后以退出码 1 结束，Vercel 事件流没有提供底层 SQL 或连接错误。为避免盲目重复可能已部分执行的 DDL，构建期迁移已暂时暂停；健康检查将以只读方式确认 `users` 表是否已存在，再根据结果选择幂等修复策略。
