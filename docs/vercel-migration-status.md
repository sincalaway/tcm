# Vercel 迁移状态记录

## 2026-08-21：TiDB 环境变量识别

预览分支 `feat/vercel-fullstack-runtime` 已推送提交 `1042fc4` 并由 Vercel 成功部署。公开健康检查地址 `https://tcm-1sknia6y3-away6.vercel.app/api/health` 返回：

```json
{"ok":true,"runtime":"vercel","databaseConfigured":true,"oauthConfigured":false,"storageConfigured":false}
```

该结果证明 `DATABASE_URL` 已注入 Preview 运行时，但不代替一次实际的 TiDB `SELECT 1` 连接验证；后续将以无写入健康检查完成连接确认，然后再执行 schema 初始化与公开目录种子。
