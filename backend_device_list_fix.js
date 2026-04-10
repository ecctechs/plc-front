// Complete fixed version of the list function for devices
// Replace the entire alarms mapping section with this code

exports.list = async (filter = {}) => {
  const devices = await repo.findAll(filter);
  
  // Build address IDs to fetch configs
  const allAddressIds = [];
  devices.forEach(device => {
    if (device.addresses) {
      device.addresses.forEach(addr => {
        allAddressIds.push(addr.id);
      });
    }
  });
  
  // Fetch all number configs and level configs in one batch
  const numberConfigs = {};
  const levelConfigs = {};
  
  if (allAddressIds.length > 0) {
    // Get all number configs
    const numberConfigsRaw = await repoNumberConfig.findByAddressIds(allAddressIds);
    numberConfigsRaw.forEach(config => {
      numberConfigs[config.address_id] = config;
    });
    
    // Get all level configs
    const levelConfigsRaw = await repoLevel.findByAddressIds(allAddressIds);
    levelConfigsRaw.forEach(config => {
      if (!levelConfigs[config.address_id]) {
        levelConfigs[config.address_id] = [];
      }
      levelConfigs[config.address_id].push(config);
    });
  }
  
  return devices.map(device => ({
    id: device.id,
    name: device.name,
    is_active: device.is_active,
    device_type: device.deviceType ? {
      id: device.deviceType.id,
      name: device.deviceType.name,
      display_types: device.deviceType.display_types
    } : null,
    room: device.room ? {
      id: device.room.id,
      name: device.room.name
    } : null,
    addresses: device.addresses ? device.addresses.map(addr => {
      const addressData = {
        id: addr.id,
        label: addr.label,
        plc_address: addr.plc_address,
        data_type: addr.data_type || [],
        refresh_rate_ms: addr.refresh_rate_ms || []
      };
      
      // Add number config if exists
      if (numberConfigs[addr.id]) {
        addressData.number_config = {
          decimal_places: numberConfigs[addr.id].decimal_places,
          scale: numberConfigs[addr.id].scale,
          offset: numberConfigs[addr.id].offset,
          min_value: numberConfigs[addr.id].min_value,
          max_value: numberConfigs[addr.id].max_value,
          unit: numberConfigs[addr.id].unit
        };
      }

      // Add level config if exists
      if (levelConfigs[addr.id] && levelConfigs[addr.id].length > 0) {
        addressData.level_config = levelConfigs[addr.id].map(l => ({
          level_index: l.level_index,
          label: l.label,
          condition_type: l.condition_type,
          min_value: l.min_value,
          max_value: l.max_value,
          mode: l.mode,
          exact_values: l.exact_values,
          include_min: l.include_min,
          include_max: l.include_max
        }));
      }
      
      return addressData;
    }) : [],
    alarms: device.alarmRules ? device.alarmRules.map(rule => {
      // ========== FIXED SECTION ==========
      // Find matching level config using level_index (more reliable)
      let level_label = null;
      let matchedLevelIndex = rule.level_index;

      // First, try to match by level_index directly
      if (rule.level_index !== undefined && rule.level_index !== null && 
          rule.address_id && levelConfigs[rule.address_id]) {
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
          // Use parseFloat for loose equality and handle decimal precision
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
      // ========== END FIXED SECTION ==========
      
      return {
        id: rule.id,
        address_id: rule.address_id,
        name: rule.name,
        data_type: rule.data_type,
        condition_type: rule.condition_type,
        min_value: rule.min_value,
        max_value: rule.max_value,
        level_index: matchedLevelIndex,
        level_label: level_label,
        duration_sec: rule.duration_sec,
        severity: rule.severity,
        is_active: rule.is_active,
        notify_email: rule.notify_email,
        email_recipients: rule.email_recipients, 
        state: rule.state ? {
          is_active: rule.state.is_active,
          last_triggered_at: rule.state.last_triggered_at,
          last_value: rule.state.last_value
        } : null
      };
    }) : []
  }));
};
