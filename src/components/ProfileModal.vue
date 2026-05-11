<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <transition name="modal-pop">
      <div class="profile-card">
        <!-- Close Button Area -->
        <button class="btn-close-top" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>

        <div class="profile-content">
          <!-- User Identity Section -->
          <div class="user-header">
            <div class="avatar-wrapper">
              <div class="avatar-main">
                <i class="fas fa-user-shield"></i>
              </div>
              <div class="status-dot" :class="{ 'online': user.is_active }"></div>
            </div>
            <h3 class="user-name">{{ user.email?.split('@')[0] }}</h3>
            <p class="user-role-badge">{{ user.role?.replace('_', ' ') }}</p>
          </div>

          <!-- Information Grid -->
          <div class="info-container">
            <div class="info-row">
              <div class="info-label">
                <i class="fas fa-fingerprint"></i>
                <span>{{ locale.current === 'th' ? 'รหัสผู้ใช้' : 'USER ID' }}</span>
              </div>
              <div class="info-value">#{{ user.id?.toString().padStart(4, '0') }}</div>
            </div>

            <div class="info-row">
              <div class="info-label">
                <i class="fas fa-envelope"></i>
                <span>{{ locale.t('Email') }}</span>
              </div>
              <div class="info-value text-truncate">{{ user.email }}</div>
            </div>

            <div class="info-row">
              <div class="info-label">
                <i class="fas fa-briefcase"></i>
                <span>{{ locale.current === 'th' ? 'รหัสพนักงาน' : 'STAFF ID' }}</span>
              </div>
              <div class="info-value">{{ user.employee_id || '—' }}</div>
            </div>

            <div class="info-row">
              <div class="info-label">
                <i class="fas fa-signal"></i>
                <span>{{ locale.current === 'th' ? 'สถานะการเชื่อมต่อ' : 'STATUS' }}</span>
              </div>
              <div class="info-value">
                <span :class="user.is_active ? 'status-active' : 'status-inactive'">
                  {{ user.is_active ? 'Active Now' : 'Inactive' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="profile-footer">
          <button class="btn-action-close" @click="$emit('close')">
            {{ locale.t('Close') }}
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'ProfileModal',
  inject: ['locale'],
  emits: ['close'],
  props: {
    user: {
      type: Object,
      required: true
    }
  }
};
</script>
<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600&display=swap');

.modal-overlay {
  font-family: 'Prompt', sans-serif;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.profile-card {
  background: #ffffff;
  width: 100%;
  max-width: 380px;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

/* Close Button */
.btn-close-top {
  position: absolute;
  top: 16px;
  right: 16px;
  background: #f3f4f6;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close-top:hover {
  background: #fee2e2;
  color: #ef4444;
}

/* User Header */
.user-header {
  padding: 40px 20px 24px;
  text-align: center;
  background: linear-gradient(to bottom, #f8faff 0%, #ffffff 100%);
}

.avatar-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
}

.avatar-main {
  width: 100%;
  height: 100%;
  background: #0062ff;
  border-radius: 24px; /* ทรงสี่เหลี่ยมโค้งล้อกับโลโก้หน้า Login */
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
  transform: rotate(-10deg); /* ล้อกับสไตล์โลโก้หน้า Login */
}

.status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 18px;
  height: 18px;
  background: #9ca3af;
  border: 3px solid white;
  border-radius: 50%;
}

.status-dot.online {
  background: #22c55e;
}

.user-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
  text-transform: capitalize;
}

.user-role-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #0062ff;
  background: #eff6ff;
  padding: 4px 12px;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Information Container */
.info-container {
  padding: 0 24px 24px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1.5px solid #f3f4f6;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #6b7280;
  font-size: 0.85rem;
}

.info-label i {
  font-size: 0.9rem;
  width: 20px;
}

.info-value {
  font-weight: 500;
  color: #374151;
  font-size: 0.95rem;
}

.status-active { color: #16a34a; font-weight: 600; }
.status-inactive { color: #9ca3af; }

/* Footer */
.profile-footer {
  padding: 16px 24px 24px;
}

.btn-action-close {
  width: 100%;
  padding: 12px;
  background: #1a1a1a;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action-close:hover {
  background: #333333;
  transform: translateY(-1px);
}

/* Animation */
.modal-pop-enter-active { animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes pop {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>