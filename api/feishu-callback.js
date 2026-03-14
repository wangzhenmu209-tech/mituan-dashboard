const { createClient } = require('@vercel/kv');

// 初始化 KV 客户端
const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async (req, res) => {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 飞书卡片回调验证
  if (req.method === 'POST') {
    try {
      const { action, type, news_index, date, period, section, content, user_id } = req.body;
      
      // 生成反馈ID
      const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 保存反馈数据
      const feedbackData = {
        id: feedbackId,
        action,
        type, // like / dislike / suggest / rating
        news_index: news_index || null,
        date: date || new Date().toISOString().split('T')[0],
        period: period || 'unknown',
        section: section || 'unknown',
        content: content || '',
        user_id: user_id || 'anonymous',
        created_at: new Date().toISOString()
      };
      
      // 保存到 KV
      await kv.set(`feedback:${feedbackId}`, JSON.stringify(feedbackData));
      await kv.lpush('feedback:list', feedbackId);
      
      // 更新统计数据
      await updateStats(feedbackData);
      
      return res.status(200).json({
        code: 0,
        message: '反馈已记录',
        data: { feedbackId }
      });
    } catch (error) {
      console.error('Callback error:', error);
      return res.status(500).json({
        code: -1,
        message: '处理失败',
        error: error.message
      });
    }
  }

  // 获取统计数据
  if (req.method === 'GET') {
    try {
      const stats = await kv.get('dashboard:stats') || '{}';
      return res.status(200).json({
        code: 0,
        data: JSON.parse(stats)
      });
    } catch (error) {
      return res.status(500).json({
        code: -1,
        message: '获取失败',
        error: error.message
      });
    }
  }

  return res.status(405).json({ code: -1, message: '方法不支持' });
};

// 更新统计数据
async function updateStats(feedback) {
  const today = new Date().toISOString().split('T')[0];
  const statsKey = `stats:${today}`;
  
  let stats = await kv.get(statsKey);
  stats = stats ? JSON.parse(stats) : {
    date: today,
    total: 0,
    likes: 0,
    dislikes: 0,
    suggestions: 0,
    ratings: [],
    sections: {}
  };
  
  stats.total++;
  
  if (feedback.type === 'like') stats.likes++;
  if (feedback.type === 'dislike') stats.dislikes++;
  if (feedback.type === 'suggest') stats.suggestions++;
  if (feedback.type === 'rating') stats.ratings.push(feedback.content);
  
  // 板块统计
  if (feedback.section && feedback.section !== 'unknown') {
    if (!stats.sections[feedback.section]) {
      stats.sections[feedback.section] = { likes: 0, dislikes: 0, total: 0 };
    }
    stats.sections[feedback.section].total++;
    if (feedback.type === 'like') stats.sections[feedback.section].likes++;
    if (feedback.type === 'dislike') stats.sections[feedback.section].dislikes++;
  }
  
  await kv.set(statsKey, JSON.stringify(stats));
  await kv.set('dashboard:stats', JSON.stringify(stats));
}
