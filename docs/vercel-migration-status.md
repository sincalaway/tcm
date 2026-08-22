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

最新 Preview 域名已被 Vercel 认证保护，未携带授权绕过 Cookie 的公开请求会重定向至 Vercel 登录页；该重定向不代表应用或 TiDB 运行时错误。后续验证将以已登录的部署控制台和受保护请求日志为准。

通过已登录控制台的同源健康检查已确认：TiDB 连接可用，且 `users`、`herbs`、`knowledge_documents`、`classic_passage_versions` 四个覆盖初始目录、个人知识库与版本对照的 schema 里程碑表均已存在。健康检查将进一步返回该四表的只读计数，以避免仅凭单表存在误判迁移完整性。

## 2026-08-21：Preview 路由与目录读取复核

Preview 的 React 深链接回退已生效：直接访问 `/bencao?q=桂枝` 会进入本草索引页，不再返回 Vercel `NOT_FOUND`。页面请求正常结束但返回 0 条药材，表明公开目录尚未成功导入；这与部分 schema 状态一致。下一步需先补齐目录种子依赖表，再重试幂等公开种子，且不得写入用户笔记、收藏或进度数据。

后续同源网络检查发现，当前 SPA 回退配置把 `/api/trpc/*` 意外重写为静态入口，导致 tRPC 请求返回 Vercel `404`。因此“0 条药材”尚不能作为种子状态结论；必须先恢复 API 路由，再检查目录种子和 TiDB 表数据。

将 API 分派置于 SPA 回退之前后，最新 Preview 的静态资源被通配路由同时拦截，导致前端空白。已在 API 规则与 SPA 回退之间恢复 Vercel 的 filesystem 路由阶段：API 先进入 Express，静态入口和资源文件按文件系统提供，只有其余前端路径才回退至 `index.html`。

最新只读健康检查显示 `coreCatalog`、`passageGraph` 与 `studyTools` 已就绪，而 `knowledgeBase`、`editionComparison` 尚缺。这说明首次 Drizzle 迁移已提交前 3 批的迁移记录并在第 4 批中止；将重新启用 `drizzle-kit migrate`，使其按迁移日志跳过已完成批次，仅继续第 4、5 批。公开目录种子将在全部阶段就绪后再执行。

后续验证表明通配 `rewrites` 仍会将 `/api/*` 改写为 `index.html`，因此不能保留 Express 的原始 tRPC 路径。路由将调整为只使用 Vercel 的 filesystem 阶段（自动匹配 `api/[...path].js` 函数与静态资源）后再回退至 React 入口；不再对 API 请求执行自定义 destination 重写。

Vercel 官方 Express 指南推荐以 `api/index` 作为单一函数入口，并把请求重写至 `/api`。迁移实现将采用该模式：先用一个 `/api/:path*` rewrite 命中函数，再对非 API 的前端路径回退至 `index.html`。这避免使用动态函数文件名与自定义 routes 组合时出现的 API 路径丢失问题。[Vercel Express 指南](https://vercel.com/kb/guide/using-express-with-vercel)

单入口函数验证已确认 Vercel 与 TiDB 的连接和 tRPC 路径均可用。公开目录恢复在创建 `knowledge_documents` 时被 TiDB 的唯一索引字节限制阻断：原 `storageKey varchar(1024)` 在默认 UTF-8 字符集下可能超过索引上限。该列已收紧为 `varchar(768)`，仍覆盖应用生成的 `knowledge/{userId}/{timestamp}-{title}` 对象键格式；变更仅影响尚未创建的空表，不修改任何用户文件或记录。[TiDB CREATE INDEX 语法](https://docs.pingcap.com/tidb/stable/sql-statement-create-index/)

单入口函数的 `/api/health` 已正常响应，但浏览器资源记录显示 `/api/trpc/catalog...` 未被单段路径模式覆盖。API rewrite 已改为 `/api/(.*)` 正则 catch-all，以覆盖 tRPC 的多层路径并保持 Express 的原始路由分派。

## 2026-08-21：Vercel–TiDB 与公开目录验收通过

最新 Preview（提交 `3b34d47`）的 `/api/health` 已返回 `databaseConfigured: true`、`databaseReachable: true`、`schemaInitialized: true`，并确认公开目录、条文关联、学习工具、知识库和版本对照五个 schema 阶段均为 ready。`catalog.filters` tRPC 请求返回公开目录筛选维度，`catalog.herbs` 对“桂枝”的查询返回 2 条相关药材，其中包含“桂枝”（性温，归心、肺、膀胱经）。这证明 Vercel Serverless Function、TiDB TLS、Express/tRPC 路由和公开目录幂等种子已协同工作；未创建或读取任何用户笔记、收藏、进度或上传文件。

## 2026-08-22：GitHub OAuth Preview 实现就绪

Preview 环境已配置 GitHub OAuth 客户端变量。应用现在通过 `/api/oauth/github` 发起授权，并由 `/api/oauth/callback` 校验一次性 CSRF state、验证回调源站、以服务器端授权码交换用户资料后创建加密会话 Cookie。身份以稳定的 `github:{numericId}` 形式写入现有用户表，私有邮箱仅在 GitHub 返回已验证邮箱时保存。浏览器端已移除 Manus sessionStorage 镜像；尚待用户在 GitHub 授权页完成一次真实授权，以核验交互回调和笔记/收藏隔离链路。

用户补齐 `GITHUB_CLIENT_ID` 并重新部署 Preview 后，稳定 Preview 健康检查已返回 `oauthConfigured: true`，同时 TiDB 连接和完整 schema 状态保持为 true。环境变量值始终未被读取或记录；下一步只需用户在 GitHub 授权页确认登录，完成回调端到端验证。

首次真实 GitHub 授权已到达 `/api/oauth/callback`，但服务器端返回 500。诊断版健康检查显示 `sessionConfigured: false`，而 OAuth 与数据库均为 true；因此当前阻塞在会话签名密钥未配置或长度不足，尚未产生持久化的用户会话。需要为 Preview 设置独立、随机且至少 32 字符的 `JWT_SECRET` 后重新部署，再重试授权。

## 2026-08-22：GitHub OAuth Preview 端到端验证通过

在为 Preview 配置独立 `JWT_SECRET` 后，真实授权仍在令牌交换阶段失败。安全诊断仅记录 GitHub 返回的非敏感错误类别：`incorrect_client_credentials`；未记录、读取或提交 Client ID、Client Secret、授权码或访问令牌。

用户在 GitHub 的 **TCM Classics Preview** OAuth App 中确认稳定 Preview 的 Redirect URI 为 `https://tcm-git-feat-vercel-fullstack-runtime-away6.vercel.app/api/oauth/callback`，随后生成新的 Client Secret，并仅更新 Vercel `Preview` 环境中的 `GITHUB_CLIENT_SECRET`。重新部署最新 Preview 后，Vercel 运行日志记录到 `/api/oauth/callback` 的 `302` 响应，且用户确认已成功返回并登录。紧邻的一次 `403` 为更新部署后对旧会话状态的失败尝试；随后的 `302` 是当前有效登录流程的成功重定向。未创建、读取或修改笔记、收藏、学习进度或知识库文件。

当前验证结论如下：GitHub OAuth 授权码交换、用户资料归一化、TiDB 用户 upsert 与会话 Cookie 签发已完成真实 Preview 登录链路验证；公开目录与既有 schema 保持不变。此验证只适用于 `feat/vercel-fullstack-runtime` 的 Preview，不涉及 `main`、Production 环境变量或生产部署。

## 2026-08-22：Preview 私有 Vercel Blob 知识库迁移

已创建名为 `tcm-knowledge-preview` 的 **Private** Vercel Blob Store（IAD1），并在 Store 的 Projects 连接中将 `tcm` 项目的环境范围由默认的 `Production, Preview` 调整为仅 **Preview**。连接使用 Vercel OIDC 运行时认证，不在项目中写入、读取或提交长期 Blob 读写令牌；控制台只显示 `BLOB_STORE_ID` 与 webhook 公钥的非敏感变量名。

提交 `b792e19` 已将知识库上传从 Manus Forge S3 封装切换为 `@vercel/blob` 私有写入：对象路径继续以 `knowledge/{userId}/` 分区，并以随机后缀避免冲突；TiDB 仅保留 Blob pathname、URL、文件元数据和可检索正文。下载不再返回对象直链，而是使用 `/api/knowledge/:id/file`：该路由先验证 GitHub 会话，再以当前用户 ID 查询文档所有权，随后从 Private Blob 流式读取，并设置 `X-Content-Type-Options: nosniff` 与 `Cache-Control: private, no-cache`。删除操作在成功删除同一私有 Blob 对象后才移除当前用户的 TiDB 元数据。

该提交的 Vercel Preview 部署已成功完成。新增 3 项私有 Blob 回归测试，连同既有测试共 **16 个测试文件、52 项测试**通过；TypeScript 检查与 Vercel 构建通过。为保护真实个人资料，本阶段未上传、读取或删除任何用户文件；私有读写与所有权隔离由路由实现和自动化测试验证。
