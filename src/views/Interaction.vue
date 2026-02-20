<template>
  <div class="interaction-page">
    <div class="image-container">
      <img src="../img/tpm_example.png" alt="TPM Example" class="tpm-image" />
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
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tpm-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
</style>
