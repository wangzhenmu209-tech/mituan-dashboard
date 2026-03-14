# 米团日报反馈看板

米团日报的用户反馈收集与数据分析平台。

## 功能

- 📊 实时反馈数据统计
- 📈 7日趋势分析
- 🏆 板块热度排行
- 💬 用户反馈展示
- 🎯 智能优化建议

## 部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/mituan-dashboard)

## 环境变量

| 变量名 | 说明 |
|--------|------|
| `FEISHU_APP_ID` | 飞书应用 ID |
| `FEISHU_APP_SECRET` | 飞书应用密钥 |
| `KV_URL` | Vercel KV 连接地址（自动配置）|
| `KV_REST_API_URL` | Vercel KV REST API 地址（自动配置）|
| `KV_REST_API_TOKEN` | Vercel KV REST API Token（自动配置）|

## API 接口

### POST /api/feishu-callback
接收飞书卡片回调

### GET /api/stats
获取统计数据

### GET /api/feedback
获取反馈列表

## 开发

```bash
npm install
vercel dev
```
