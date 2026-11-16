process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// โหลด .env.<NODE_ENV> ก่อน require module อื่น — ไม่งั้น module ที่อ่าน env ตอนโหลด (เช่น auth.middleware) จะได้ค่า undefined
require('dotenv').config({
  path: require('path').resolve(__dirname, '..', `.env.${process.env.NODE_ENV}`)
});

const app = require('./app');

const { startPollWorker } = require('../plcPoller');
const { startDailyOEEJob } = require('../jobs/dailyOEEJob');
const { startHourlyOEEJob } = require('../jobs/hourlyOEEJob');
const { startDataRetentionJob } = require('../jobs/dataRetentionJob');

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

   await startPollWorker();
   startDailyOEEJob();
   startHourlyOEEJob();
   startDataRetentionJob();
});
