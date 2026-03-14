const { createClient } = require('@vercel/kv');

const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ code: -1, message: '方法不支持' });
  }

  try {
    // 获取最近7天的数据
    const days = 7;
    const trendData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const stats = await kv.get(`stats:${dateStr}`);
      if (stats) {
        const data = JSON.parse(stats);
        trendData.push({
          date: dateStr,
          total: data.total,
          likes: data.likes,
          dislikes: data.dislikes,
          suggestions: data.suggestions
        });
      } else {
        trendData.push({
          date: dateStr,
          total: 0,
          likes: 0,
          dislikes: 0,
          suggestions: 0
        });
      }
    }
    
    // 获取今日数据
    const today = new Date().toISOString().split('T')[0];
    const todayStats = await kv.get(`stats:${today}`);
    const todayData = todayStats ? JSON.parse(todayStats) : null;
    
    // 计算板块热度
    const sectionRanking = [];
    if (todayData && todayData.sections) {
      for (const [name, data] of Object.entries(todayData.sections)) {
        const score = data.total > 0 ? Math.round((data.likes / data.total) * 100) : 0;
        sectionRanking.push({ name, score, total: data.total });
      }
      sectionRanking.sort((a, b) => b.score - a.score);
    }
    
    // 获取最新反馈
    const feedbackIds = await kv.lrange('feedback:list', 0, 9);
    const latestFeedback = [];
    
    for (const id of feedbackIds) {
      const fb = await kv.get(`feedback:${id}`);
      if (fb) {
        const data = JSON.parse(fb);
        latestFeedback.push({
          type: data.type === 'like' ? '👍' : data.type === 'dislike' ? '👎' : '💬',
          content: data.content || (data.type === 'like' ? '觉得有用' : data.type === 'dislike' ? '觉得无用' : '无内容'),
          time: new Date(data.created_at).toLocaleString('zh-CN'),
          section: data.section
        });
      }
    }
    
    return res.status(200).json({
      code: 0,
      data: {
        today: todayData ? {
          total: todayData.total,
          goodRate: todayData.total > 0 ? Math.round((todayData.likes / todayData.total) * 100) : 0,
          hotSection: sectionRanking.length > 0 ? sectionRanking[0].name : '-',
          sentStatus: '成功'
        } : {
          total: 0,
          goodRate: 0,
          hotSection: '-',
          sentStatus: '暂无数据'
        },
        trend: trendData,
        sections: sectionRanking,
        feedbacks: latestFeedback
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({
      code: -1,
      message: '获取失败',
      error: error.message
    });
  }
};
