const repo = require('../repositories/deviceLevelConfig.repo');
const addressRepo = require('../repositories/deviceAddress.repo');

// Sync (replace) all level configs for an address
exports.syncLevels = async (addressId, levelsArray) => {
  const address = await addressRepo.findById(addressId);
  if (!address) throw new Error('ไม่พบ Address');

  if (address.data_type !== 'level') throw new Error('Address นี้ไม่ใช่ประเภท Level');
  if (!Array.isArray(levelsArray)) throw new Error('รูปแบบข้อมูล Level ไม่ถูกต้อง');

  levelsArray.forEach(level => validateLevel(level, false));

  await repo.removeByAddressId(addressId);

  const saved = [];
  for (let i = 0; i < levelsArray.length; i++) {
    const row = await repo.create({ ...levelsArray[i], level_index: i, address_id: addressId });
    saved.push(row);
  }
  return saved;
};

// GET all level configs for an address
exports.getByAddressId = async (addressId) => {
  const address = await addressRepo.findById(addressId);
  if (!address) throw new Error('ไม่พบ Address');

  const levels = await repo.findByAddressId(addressId);
  return levels;
};

function validateLevel(p, isUpdate = false) {
  if (!isUpdate && (!p.label || !p.condition_type)) {
    throw new Error('กรุณากรอกชื่อและเงื่อนไขของ Level');
  }

  if (p.condition_type === 'BTW') {
    if (p.min_value == null || p.max_value == null) throw new Error('เงื่อนไข "ระหว่าง" ต้องกรอกทั้งค่าต่ำสุดและค่าสูงสุด');
    if (Number(p.min_value) >= Number(p.max_value)) throw new Error('ค่าต่ำสุดต้องน้อยกว่าค่าสูงสุด');
  }

  // if (p.condition_type === 'LTE' && p.max_value == null) throw new Error('LTE requires max_value');
  if (p.condition_type === 'GTE' && p.min_value == null) throw new Error('เงื่อนไขนี้ต้องกรอกค่าต่ำสุด');
}
