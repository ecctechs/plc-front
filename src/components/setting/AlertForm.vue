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
          <div class="col-md-4">
            <label class="form-label small fw-bold">Alarm Name</label>
            <input v-model="alarm.name" type="text" class="form-control form-control-sm" placeholder="เช่น High Temp">
          </div>

          <div class="col-md-4">
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

          <div class="col-md-4">
            <label class="form-label small fw-bold">Threshold Value</label>
            
            <select v-if="dataType === 'onoff'" v-model="alarm.min_value" class="form-select form-select-sm">
              <option :value="1">ON</option>
              <option :value="0">OFF</option>
            </select>

            <select 
              v-else-if="dataType === 'level'" 
              class="form-select form-select-sm"
              :value="alarm.level_label"
              @change="(e) => applyLevelRule(index, e.target.value)"
            >
              <option value="">-- เลือก Level --</option>
              <option 
                v-for="lvl in levelLabels" 
                :key="lvl.label" 
                :value="lvl.label"
              >
                {{ lvl.label }}
              </option>
            </select>

            <div v-else class="input-group input-group-sm">
              <input 
                v-if="alarm.condition_type !== 'LT' && alarm.condition_type !== 'LTE'"
                v-model.number="alarm.min_value" 
                type="number" 
                class="form-control" 
                :placeholder="alarm.condition_type === 'BTW' ? 'Min' : 'Value'"
              >
              <span v-if="alarm.condition_type === 'BTW'" class="input-group-text">-</span>
              <input 
                v-if="['LT', 'LTE', 'BTW'].includes(alarm.condition_type)"
                v-model.number="alarm.max_value" 
                type="number" 
                class="form-control" 
                placeholder="Max"
              >
            </div>
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
              placeholder=""
              :value="alarm.email_recipients.join(', ')"
              @input="(e) => updateEmails(index, e.target.value)"
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    modelValue: { type: Array, default: () => [] },
    dataType: { type: String, default: 'number' },
    levelLabels: { type: Array, default: () => [] }
  },
  emits: ['update:modelValue'],
  watch: {
    // บังคับ Condition เป็น EXACT ทันทีเมื่อสลับเป็น onoff หรือ level
    dataType: {
      immediate: true,
      handler(newType) {
        if (['onoff', 'level'].includes(newType)) {
          this.modelValue.forEach(alarm => {
            alarm.condition_type = 'EXACT';
          });
        }
      }
    }
  },
  methods: {
    // นำค่า Rule ทั้งชุดจาก Level ที่เลือกมาเก็บใน Alarm
    applyLevelRule(index, label) {
      const selectedLvl = this.levelLabels.find(l => l.label === label);
      if (!selectedLvl) return;

      const newList = JSON.parse(JSON.stringify(this.modelValue));
      newList[index] = {
        ...newList[index],
        level_label: selectedLvl.label,         // เก็บชื่อไว้โชว์ใน UI
        condition_type: selectedLvl.condition_type, // เช่น LT, BTW, MT
        min_value: selectedLvl.min_value,
        max_value: selectedLvl.max_value,
        include_min: selectedLvl.include_min,
        include_max: selectedLvl.include_max
      };
      this.$emit('update:modelValue', newList);
    },
    addAlarm() {
      const isSpecial = ['onoff', 'level'].includes(this.dataType);
      const newList = [...this.modelValue, {
        name: "",
        condition_type: isSpecial ? "EXACT" : "MTE",
        min_value: this.dataType === 'onoff' ? 1 : 0,
        max_value: 0,
        level_label: "",
        severity: "critical",
        notify_email: false,
        email_recipients: [],
        is_active: true
      }];
      this.$emit('update:modelValue', newList);
    },
    removeAlarm(index) {
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