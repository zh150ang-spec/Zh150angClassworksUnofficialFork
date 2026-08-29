<template>
  <a
    aria-label="xICP备x号"
    class="floating-icp-link"
    href="https://beian.miit.gov.cn/"
    rel="noopener noreferrer"
    target="_blank"
    style="display: none;"
  >
    xICP备x号
  </a>
</template>

<script>
export default {
  name: 'FloatingICP',
}

</script>

<style scoped>
.floating-icp-link {
  position: fixed;
  right: var(--space-1);
  bottom: 0;
  z-index: var(--z-float);
  font-size: 14px;
  font-weight: var(--font-weight-emphasis);
  letter-spacing: 0.2px;
  color: var(--text-quaternary);
  text-decoration: none;
  background: transparent;
  border: none;
  box-shadow: none;
  transition: none !important;
}

.floating-icp-link:hover,
.floating-icp-link:focus,
.floating-icp-link:active {
  color: var(--text-tertiary);
  text-decoration: none;
  outline: none;
}

@media (max-width: 600px) {
  .floating-icp-link {
    right: var(--space-4);
    bottom: 0;
    font-size: 14px;
  }
}
</style>
