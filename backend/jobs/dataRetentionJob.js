const cron = require('node-cron');
const dataRetentionService = require('../services/dataRetention.service');

// ลบ Log เก่าทุกวันตอนตี 3 — เปิดเมื่อตั้ง LOG_RETENTION_DAYS ใน .env เท่านั้น (ไม่ลบข้อมูลเองถ้ายังไม่ได้ตกลงจำนวนวัน)
function startDataRetentionJob() {
  if (!(parseInt(process.env.LOG_RETENTION_DAYS, 10) > 0)) {
    console.log('[Cron] Data retention job disabled (set LOG_RETENTION_DAYS to enable)');
    return;
  }

  const days = dataRetentionService.getRetentionDays();
  cron.schedule('0 3 * * *', async () => {
    try {
      const result = await dataRetentionService.cleanOldLogs({ days });
      console.log(`[Cron] Deleted logs older than ${days} days:`, result.deleted);
    } catch (err) {
      console.error('[Cron] Data retention failed:', err.message);
    }
  });

  console.log(`[Cron] Data retention job registered (03:00 daily, keep ${days} days)`);
}

module.exports = { startDataRetentionJob };
