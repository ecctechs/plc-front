# Backend Fix for Level Alarm Threshold Value

## Problem
การ match level_label ด้วย min/max values ใช้ exact equality (`===`) ซึ่งอาจไม่ตรงกันถ้ามี decimal precision ต่างกัน หรือ data type ต่างกัน

## Solution
ใช้ `level_index` โดยตรงในการ match แทนการ match ด้วย min/max

## แก้ไขในไฟล์ที่มีฟังก์ชัน list (devices)

เปลี่ยนโค้ดส่วนนี้:

```javascript
// Find matching level config based on min/max values
let level_label = null;
let matchedLevelIndex = rule.level_index;

if (rule.address_id && levelConfigs[rule.address_id]) {
  const levels = levelConfigs[rule.address_id];
  for (const level of levels) {
    // Check if alarm's min/max matches level's min/max
    const minMatch = rule.min_value === level.min_value || (rule.min_value === null && level.min_value === null);
    const maxMatch = rule.max_value === level.max_value || (rule.max_value === null && level.max_value === null);
    
    if (minMatch && maxMatch) {
      level_label = level.label;
      matchedLevelIndex = level.level_index;
      break;
    }
  }
}
```

เป็น:

```javascript
// Find matching level config using level_index (more reliable)
let level_label = null;
let matchedLevelIndex = rule.level_index;

if (rule.level_index !== undefined && rule.level_index !== null && rule.address_id && levelConfigs[rule.address_id]) {
  const levels = levelConfigs[rule.address_id];
  const foundLevel = levels.find(l => l.level_index === rule.level_index);
  if (foundLevel) {
    level_label = foundLevel.label;
    matchedLevelIndex = foundLevel.level_index;
  }
}

// Fallback: try matching by min/max if level_index not available or not found
if (!level_label && rule.address_id && levelConfigs[rule.address_id]) {
  const levels = levelConfigs[rule.address_id];
  for (const level of levels) {
    // Use loose equality and handle decimal precision
    const minMatch = parseFloat(rule.min_value) === parseFloat(level.min_value) || 
                     (rule.min_value == null && level.min_value == null);
    const maxMatch = parseFloat(rule.max_value) === parseFloat(level.max_value) || 
                     (rule.max_value == null && level.max_value == null);
    
    if (minMatch && maxMatch) {
      level_label = level.label;
      matchedLevelIndex = level.level_index;
      break;
    }
  }
}
```

## Key Changes
1. **ใช้ level_index เป็นหลัก** - ถ้ามี level_index ให้ใช้หา level ที่ตรงกันโดยตรง
2. **Fallback เป็น min/max** - ถ้าไม่มี level_index หรือหาไม่เจอ ค่อยใช้วิธีเดิม
3. **ใช้ parseFloat()** - สำหรับการ compare ที่ยืดหยุ่นกว่า
