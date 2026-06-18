<template>
  <div class="card bg-light border-0 mb-3">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0 fw-bold text-primary">
          <i class="bi bi-bell-fill me-2"></i>Alarm Settings
        </h6>
        <button type="button" class="btn btn-outline-primary btn-sm" @click="addAlarm">
          + เพิ่มเงื่อนไขการเตือน
        </button>
      </div>

      <div v-for="(alarm, index) in modelValue" :key="index" class="border-bottom pb-3 mb-3 position-relative">
        <button @click="removeAlarm(index)" class="btn-close position-absolute end-0 top-0" style="font-size: 0.7rem;"></button>

        <div class="row g-2">
          <div class="col-md-3">
            <label class="form-label small fw-bold">Alarm Name</label>
            <input 
              v-model="alarm.name" 
              type="text" 
              class="form-control form-control-sm" 
              :class="{'is-invalid': hasError(index, 'name')}"
              placeholder="เช่น High Temp"
            >
          </div>

          <div class="col-md-3">
            <label class="form-label small fw-bold">Condition</label>
            <select 
              :value="['onoff', 'level'].includes(dataType) ? 'EXACT' : alarm.condition_type"
              @input="e => alarm.condition_type = e.target.value"
              class="form-select form-select-sm"
              :disabled="['onoff', 'level'].includes(dataType)"
            >
              <option value="EXACT">Equal (==)</option>
              <template v-if="dataType !== 'onoff' && dataType !== 'level'">
                <option value="MT">More Than (> )</option>
                <option value="MTE">More Than or Equal (>=)</option>
                <option value="LT">Less Than (< )</option>
                <option value="LTE">Less Than or Equal (<=)</option>
                <option value="BTW">Between (In Range)</option>
              </template>
            </select>
          </div>

          <div class="col-md-3">
            <label class="form-label small fw-bold">Threshold Value</label>
            <div v-if="dataType === 'onoff'">
              <select v-model="alarm.min_value" class="form-select form-select-sm">
                <option :value="1">ON</option>
                <option :value="0">OFF</option>
              </select>
            </div>
            <div v-else-if="dataType === 'level'">
              <select 
                class="form-select form-select-sm"
                :class="{'is-invalid': hasError(index, 'threshold')}"
                :value="alarm.level_label"
                @change="(e) => applyLevelRule(index, e.target.value)"
              >
                <option value="">-- เลือก Level --</option>
                <option v-for="lvl in levelLabels" :key="lvl.label" :value="lvl.label">{{ lvl.label }}</option>
              </select>
            </div>
            <div v-else class="input-group input-group-sm">
              <input 
                v-if="alarm.condition_type !== 'LT' && alarm.condition_type !== 'LTE'"
                v-model.number="alarm.min_value" 
                type="number" 
                class="form-control" 
                :class="{'is-invalid': hasError(index, 'threshold')}"
                :placeholder="alarm.condition_type === 'BTW' ? 'Min' : 'Value'"
              >
              <span v-if="alarm.condition_type === 'BTW'" class="input-group-text">-</span>
              <input 
                v-if="['LT', 'LTE', 'BTW'].includes(alarm.condition_type)"
                v-model.number="alarm.max_value" 
                type="number" 
                class="form-control" 
                :class="{'is-invalid': hasError(index, 'threshold')}"
                placeholder="Max"
              >
            </div>
          </div>

          <div class="col-md-3">
            <label class="form-label small fw-bold">Severity</label>
            <select v-model="alarm.severity" class="form-select form-select-sm">
              <!-- <option value="Normal">Normal </option> -->
              <option value="Warning">Warning </option>
              <option value="Error">Error </option>
            </select>
          </div>

          <div class="col-md-12 d-flex align-items-center gap-3 mt-1">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" v-model="alarm.notify_email">
              <label class="form-check-label small">Email Notify</label>
            </div>
            <input 
              v-if="alarm.notify_email"
              type="text" 
              class="form-control form-control-sm flex-grow-1" 
              :class="{'is-invalid': hasError(index, 'email')}"
              placeholder="อีเมล (คั่นด้วยจุลภาค)"
              :value="(alarm.email_recipients || []).join(', ')"
              @input="(e) => updateEmails(index, e.target.value)"
            >
          </div>
        </div>
        <div v-for="err in errors.filter(e => e.index === index)" :key="err.field" class="text-danger extra-small mt-1">
          <i class="bi bi-x-circle me-1"></i>{{ err.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const BASE_API = import.meta.env.VITE_API_BASE_URL;
const authH = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

export default {
  props: {
    modelValue: { type: Array, default: () => [] },
    dataType: { type: String, default: 'number' },
    levelLabels: { type: Array, default: () => [] },
    numberConfig: { type: Object, default: null },
    levels: { type: Array, default: () => [] }
  },
  emits: ['update:modelValue', 'remove-alarm'],
  data() {
    return {
      errors: [] // เก็บสถานะ Error ภายใน
    }
  },
  methods: {
    async saveAlarms(savedAddrId) {
      if (!this.modelValue || this.modelValue.length === 0) return;
      
      for (const alarm of this.modelValue) {
        const res = await fetch(`${BASE_API}/api/addresses/${savedAddrId}/alarms`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authH() },
          body: JSON.stringify({
            ...alarm,
            data_type: this.dataType,
            is_active: true
          })
        });
        if (!res.ok) throw new Error(`Failed to save alarm "${alarm.name}"`);
      }
    },
    
    // Validate and throw error if invalid (for use by parent)
    validateWithError() {
      const isValid = this.validateAlarms();
      if (!isValid) {
        throw new Error("การตั้งค่า Alarm ไม่ถูกต้อง (มีชื่อซ้ำ, ค่าว่าง หรือช่วงทับซ้อนกัน)");
      }
    },
    
    // Save all sub-configs for an address (number, level, alarms)
    async saveAllConfigs(savedAddrId) {
      // 1. Save Number Config
      if (["number", "number_gauge"].includes(this.dataType) && this.numberConfig) {
        await fetch(`${BASE_API}/api/addresses/${savedAddrId}/number-config`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authH() },
          body: JSON.stringify(this.numberConfig)
        });
      }

      // 2. Save Level Config
      if (this.dataType === "level" && this.levels) {
        await fetch(`${BASE_API}/api/addresses/${savedAddrId}/levels`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authH() },
          body: JSON.stringify(this.levels)
        });

        // Fetch saved levels to get the new level_index for alarms
        const levelsResponse = await fetch(`${BASE_API}/api/addresses/${savedAddrId}/levels`, { headers: authH() });
        const savedLevels = await levelsResponse.json();
        console.log('Saved levels for alarm mapping:', savedLevels);

        // Update alarms with correct level_index based on level_label
        if (this.modelValue && this.modelValue.length > 0) {
          const updatedAlarms = this.modelValue.map(alarm => {
            if (alarm.level_label) {
              const matchedLevel = savedLevels.find(l => l.label === alarm.level_label);
              if (matchedLevel) {
                console.log(`Mapping alarm "${alarm.name}" to level_index: ${matchedLevel.level_index}`);
                return { ...alarm, level_index: matchedLevel.level_index };
              }
            }
            return alarm;
          });
          // Update modelValue with corrected level_index
          this.$emit('update:modelValue', updatedAlarms);
        }
      }

      // 3. Save Alarms
      await this.saveAlarms(savedAddrId);
    },
    hasError(index, field) {
      return this.errors.some(e => e.index === index && e.field === field);
    },
    validateAlarms() {
      this.errors = [];
      const alarms = this.modelValue;
      const nameSet = new Set();
      const duplicateNames = new Set();

      // หาชื่อที่ซ้ำกันก่อน
      alarms.forEach(a => {
        const name = a.name ? a.name.trim() : "";
        if (name !== "") {
          if (nameSet.has(name)) duplicateNames.add(name);
          nameSet.add(name);
        }
      });

      for (let i = 0; i < alarms.length; i++) {
        const a = alarms[i];
        const currentName = a.name ? a.name.trim() : "";
        
        // 1. ตรวจสอบค่าว่าง
        if (!currentName) {
          this.errors.push({ index: i, field: 'name', message: 'กรุณาระบุชื่อ Alarm (ห้ามว่าง)' });
        } 
        // 2. ตรวจสอบชื่อซ้ำ
        else if (duplicateNames.has(currentName)) {
          this.errors.push({ index: i, field: 'name', message: `ชื่อ "${currentName}" ซ้ำกับ Alarm อื่น` });
        }

        // 3. ตรวจสอบการเหลื่อมกัน (Overlap)
        if (['number', 'number_gauge'].includes(this.dataType)) {
          if (a.condition_type === 'BTW' && a.min_value >= a.max_value) {
            this.errors.push({ index: i, field: 'threshold', message: 'ค่า Min ต้องน้อยกว่า Max' });
          }
          for (let j = i + 1; j < alarms.length; j++) {
            if (this.isOverlapping(a, alarms[j])) {
              const msg = `ช่วงค่าทับซ้อนกับ [${alarms[j].name || j+1}]`;
              this.errors.push({ index: i, field: 'threshold', message: msg });
              this.errors.push({ index: j, field: 'threshold', message: msg });
            }
          }
        }
      }
      return this.errors.length === 0;
    },

    isOverlapping(a1, a2) {
      const r1 = this.getRange(a1);
      const r2 = this.getRange(a2);
      if (!r1 || !r2) return false;
      // สูตรเช็คทับซ้อน: (StartA < EndB) และ (EndA > StartB)
      return r1.min < r2.max && r1.max > r2.min;
    },

    getRange(alarm) {
      let min = -Infinity, max = Infinity;
      const v1 = alarm.min_value ?? 0;
      const v2 = alarm.max_value ?? 0;

      switch (alarm.condition_type) {
        case 'EXACT': min = v1; max = v1 + 0.0001; break;
        case 'MT':  min = v1 + 0.0001; break;
        case 'MTE': min = v1; break;
        case 'LT':  max = v2 - 0.0001; break;
        case 'LTE': max = v2; break;
        case 'BTW': min = v1; max = v2; break;
        default: return null;
      }
      return { min, max };
    },

    addAlarm() {
      const isSpecial = ['onoff', 'level'].includes(this.dataType);
      const newList = [...this.modelValue, {
        name: "",
        condition_type: isSpecial ? "EXACT" : "MTE",
        min_value: this.dataType === 'onoff' ? 1 : 0,
        max_value: 0,
        severity: "Warning",
        notify_email: false,
        email_recipients: [],
        is_active: true
      }];
      this.$emit('update:modelValue', newList);
    },
    // ... rest of existing methods (applyLevelRule, removeAlarm, updateEmails) ...
    applyLevelRule(index, label) {
      const selectedLvl = this.levelLabels.find(l => l.label === label);
      if (!selectedLvl) return;
      const newList = JSON.parse(JSON.stringify(this.modelValue));
      newList[index] = { 
        ...newList[index], 
        level_label: selectedLvl.label, 
        level_index: selectedLvl.level_index,
        condition_type: selectedLvl.condition_type, 
        min_value: selectedLvl.min_value, 
        max_value: selectedLvl.max_value 
      };
      this.$emit('update:modelValue', newList);
    },
    removeAlarm(index) {
      const alarm = this.modelValue[index];
      if (alarm && alarm.id) {
        this.$emit('remove-alarm', alarm.id);
      }
      const newList = this.modelValue.filter((_, i) => i !== index);
      this.$emit('update:modelValue', newList);
    },
    updateEmails(index, value) {
      const newList = JSON.parse(JSON.stringify(this.modelValue));
      newList[index].email_recipients = value.split(',').map(s => s.trim()).filter(s => s !== "");
      this.$emit('update:modelValue', newList);
    }
  }
}
</script>
<style scoped> .extra-small { font-size: 0.75rem; } </style>