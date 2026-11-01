<template>
  <a
    aria-label="xICP备x号"
    class="floating-icp-link"
    href="https://beian.miit.gov.cn/"
    rel="noopener noreferrer"
    target="_blank"
    style="display: none"
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
  right: 0.25rem;
  bottom: 0;
  z-index: 100;
  font-size: 14px;
  font-weight: 500;
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
    right: 1rem;
    bottom: 0;
    font-size: 14px;
  }
}
</style>
