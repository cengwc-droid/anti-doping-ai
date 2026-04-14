# Anti-Doping AI

一个面向运动员使用场景的兴奋剂风险问答网站原型。当前版本重点是做出一个“合规优先”的早期产品闭环，而不是只堆一个聊天框。

## 当前已完成

- 首页已经升级为完整的产品落地页，而不是默认模板页
- 问答接口已接入千问模型
- 回答采用结构化输出：风险等级、风险摘要、下一步动作、核对项、免责声明
- 后端会先检索本地规则库，再让模型基于命中资料组织回答
- 前端支持快速提问、本地历史保存、规则快速检索和使用前核对清单
- 每次提问会生成本地复核记录，可在后台更新人工复核状态和备注
- 前台支持上传药品或补剂标签图片，并在有图片时调用千问视觉模型辅助提取可见信息
- 后台登录支持通过 `ADMIN_USERS` 配置多个用户和角色
- 已补齐 `metadata`、`robots`、`sitemap`

## 技术栈

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- OpenAI Node SDK 兼容调用千问接口

## 本地启动

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env.local
```

至少需要填写：

- `QWEN_API_KEY`
- `QWEN_BASE_URL`
- `QWEN_MODEL`
- `QWEN_VISION_MODEL`

如果你准备部署，也建议配置：

- `NEXT_PUBLIC_SITE_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_USERS`

3. 启动开发环境

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看页面。

## 目录说明

- [app/page.tsx](/Users/chun/anti-doping-ai/app/page.tsx)：首页与信息架构
- [app/components/anti-doping-assistant.tsx](/Users/chun/anti-doping-ai/app/components/anti-doping-assistant.tsx)：主问答交互、历史记录、规则检索面板
- [app/api/ask/route.ts](/Users/chun/anti-doping-ai/app/api/ask/route.ts)：问答接口
- [app/api/rules/route.ts](/Users/chun/anti-doping-ai/app/api/rules/route.ts)：规则检索接口
- [app/api/review/route.ts](/Users/chun/anti-doping-ai/app/api/review/route.ts)：复核记录接口
- [app/admin/page.tsx](/Users/chun/anti-doping-ai/app/admin/page.tsx)：复核后台页面
- [knowledge/anti-doping-rules.json](/Users/chun/anti-doping-ai/knowledge/anti-doping-rules.json)：本地规则库
- [lib/anti-doping-rules.ts](/Users/chun/anti-doping-ai/lib/anti-doping-rules.ts)：本地规则检索逻辑
- [lib/question-records.ts](/Users/chun/anti-doping-ai/lib/question-records.ts)：本地提问记录与复核状态存储

## 复核后台

本地启动后打开：

```bash
http://localhost:3000/admin
```

提交过的问题会进入复核后台。后台已加入登录保护，默认读取 `ADMIN_USERS`，如果没有配置则回退到 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`。

示例：

```bash
ADMIN_USERS=admin:admin123456:admin,reviewer:reviewer123456:reviewer
```

当前版本使用本地 `data/question-records.json` 存储复核记录，该目录已加入 `.gitignore`，适合本机开发和内测。正式上线时建议换成数据库，并增加更完整的账号、权限和审计日志。

## 图片上传

前台问答支持上传药品或补剂标签图片。上传图片后，接口会使用 `QWEN_VISION_MODEL` 处理图片输入，并要求模型先提取可见的商品名、成分、剂量和警示语，再结合本地规则库输出风险判断。

图片识别只作为辅助，不能替代人工核验。图片不清晰、成分表不完整或标签语言不确定时，应继续进入后台复核流程。

## 现在的定位

这是一个适合演示、内测和继续迭代的版本，已经可以跑通真实问题的前台问答流程，但还不应该被视为最终的正式合规系统。

## 上线说明

正式上线前请先阅读 [DEPLOYMENT.md](/Users/chun/anti-doping-ai/DEPLOYMENT.md)。

当前后台复核记录仍使用本地文件存储，适合本机演示和内部预览，不适合作为生产环境的持久化数据层。若要给真实用户长期使用，应先接 Supabase、Postgres、MySQL 或阿里云 RDS 等托管数据库。

下一阶段最值得继续补的是：

- 扩充更权威、更细的规则数据来源
- 增加提问日志、后台审核、人工复核流程
- 增加用户体系和机构管理视角
- 做部署、监控和错误追踪
