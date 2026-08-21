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
