<template>
  <div class="interaction-page">
    <div class="image-container">
      <div class="machine-bg"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Interaction'
}
</script>

<style scoped>
.interaction-page {
  width: 100%;
  height: calc(100vh - 140px);
  padding: 0;
  margin: 0;
}

.image-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.machine-bg {
  width: 100%;
  height: 100%;
  background-image: url('../img/tpm_line.png');
  background-size: 100% auto;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
</style>
