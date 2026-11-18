const service = require('../services/downtimeProduct.service');

exports.getDowntimeSummary = async (req, res) => {
  try {
    const { productId } = req.params;
    const { start, end } = req.query;

    if (!productId || !start || !end) {
      return res.status(400).json({
        message: 'กรุณาระบุสินค้าและช่วงเวลาเริ่มต้น / สิ้นสุด'
      });
    }

    const result = await service.getDowntimeSummary(
      parseInt(productId),
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
    const { productId } = req.params;
    const { event_type, reason } = req.body;

    if (!event_type || !['START', 'END'].includes(event_type)) {
      return res.status(400).json({
        message: 'ประเภทเหตุการณ์ต้องเป็น START หรือ END'
      });
    }

    const result = await service.logEvent(parseInt(productId), event_type, reason, req.companyId);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};
