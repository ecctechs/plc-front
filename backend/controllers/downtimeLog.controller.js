const service = require('../services/downtimeLog.service');

exports.getDowntimeSummary = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { start, end } = req.query;

    if (!deviceId || !start || !end) {
      return res.status(400).json({
        message: 'กรุณาระบุอุปกรณ์และช่วงเวลาเริ่มต้น / สิ้นสุด'
      });
    }

    const result = await service.getDowntimeSummary(
      parseInt(deviceId),
      new Date(start),
      new Date(end),
      req.companyId
    );

    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.logDowntimeEvent = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { event_type, reason } = req.body;

    if (!event_type || !['START', 'END'].includes(event_type)) {
      return res.status(400).json({
        message: 'ประเภทเหตุการณ์ต้องเป็น START หรือ END'
      });
    }

    const result = await service.logEvent(parseInt(deviceId), event_type, req.companyId, reason);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};
