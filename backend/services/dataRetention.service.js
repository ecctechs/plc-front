'use strict';

const { Op } = require('sequelize');
const { DowntimeLog, DowntimeProduct, ProductLog, DeviceLog, DeviceAddress, Device, Product } = require('../models');

// จำนวนวันที่เก็บ Log ไว้: ตั้งใน .env (LOG_RETENTION_DAYS) ถ้าไม่ตั้งใช้ 2 วันเหมือนเดิม
const DEFAULT_RETENTION_DAYS = 2;

function getRetentionDays() {
  const days = parseInt(process.env.LOG_RETENTION_DAYS, 10);
  return days > 0 ? days : DEFAULT_RETENTION_DAYS;
}

function getCutoffDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// companyId = null → ทุกบริษัท (ใช้ตอนตั้งเวลาอัตโนมัติ)
async function getScope(companyId) {
  if (companyId == null) return { addressIds: null, productIds: null };

  const addresses = await DeviceAddress.findAll({
    attributes: ['id'],
    include: [{ model: Device, as: 'device', attributes: [], where: { company_id: companyId }, required: true }],
    raw: true
  });
  const products = await Product.findAll({ attributes: ['id'], where: { company_id: companyId }, raw: true });

  return { addressIds: addresses.map(a => a.id), productIds: products.map(p => p.id) };
}

exports.getRetentionDays = getRetentionDays;

exports.cleanOldLogs = async ({ companyId = null, days = getRetentionDays() } = {}) => {
  const cutoff = getCutoffDate(days);
  const { addressIds, productIds } = await getScope(companyId);

  const byAddress = addressIds ? { address_id: { [Op.in]: addressIds } } : {};
  const byProduct = productIds ? { product_id: { [Op.in]: productIds } } : {};
  const older = { created_at: { [Op.lt]: cutoff } };

  const [downtimeLogs, downtimeProducts, productLogs, deviceLogs] = await Promise.all([
    DowntimeLog.destroy({ where: { ...older, ...byAddress } }),
    DowntimeProduct.destroy({ where: { ...older, ...byProduct } }),
    ProductLog.destroy({ where: { ...older, ...byProduct } }),
    DeviceLog.destroy({ where: { ...older, ...byAddress } })
  ]);

  return {
    cutoff,
    days,
    deleted: { downtimeLogs, downtimeProducts, productLogs, deviceLogs }
  };
};
