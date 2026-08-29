<template>
  <settings-card
    border
    :icon="ICON.THOUGHT_BUBBLE"
    title="回声洞"
    @click="handleClick"
  >
    <v-card-text>
      <div
        ref="typewriter"
        class="typewriter-text"
      />
      <div
        ref="sourceWriter"
        class="source-text"
      />
    </v-card-text>
    <transition name="fade">
      <v-chip
        v-if="currentQuote?.contributor"
        class="contributor"
      >
        <v-avatar start>
          <v-img :src="`https://github.com/${currentQuote.contributor}.png`" />
        </v-avatar>
        {{ currentQuote.contributor }}
      </v-chip>
    </transition>
  </settings-card>
</template>

<script>
import quotes from "@/data/echoChamber.json";

// typewriter-effect 按需动态加载
let TypewriterClass = null;
async function getTypewriter() {
  if (!TypewriterClass) {
    TypewriterClass = (await import('typewriter-effect/dist/core')).default;
  }
  return TypewriterClass;
}
import SettingsCard from "@/components/settings/SettingsCard.vue";

const INITIAL_STATE = {
  text: "点击此处查看来自用户社区的精选语录",
  author: "点击后会将当前句子复制到剪贴板"
};

const TYPEWRITER_CONFIG = {
  main: {delay: 50, deleteSpeed: 100},
  source: {delay: 10, deleteSpeed: 10, cursor: ""}
};

export default {
  name: "EchoChamberCard",
  components: {SettingsCard},
  data: () => ({
    ICON,
    typewriter: null,
    sourceWriter: null,
    currentQuote: INITIAL_STATE,
    hasClicked: false
  }),

  mounted() {
    this.initTypewriters();
  },

  beforeUnmount() {
    [this.typewriter, this.sourceWriter].forEach(writer => writer?.stop());
  },

  methods: {
    async initTypewriters() {
      const Typewriter = await getTypewriter();
      this.typewriter = new Typewriter(this.$refs.typewriter, TYPEWRITER_CONFIG.main);
      this.sourceWriter = new Typewriter(this.$refs.sourceWriter, TYPEWRITER_CONFIG.source);
      this.typeQuote(INITIAL_STATE);
    },

    typeQuote(quote) {
      this.typewriter.deleteAll(30).typeString(quote.text).start();
      if (quote.author) {
        this.sourceWriter.deleteAll(20).typeString(quote.author).start();
      }
    },

    async handleClick() {
      if (!this.hasClicked) {
        this.hasClicked = true;
      }
      await this.copyToClipboard();
      this.currentQuote = this.getRandomQuote();
      this.typeQuote(this.currentQuote);
    },

    getRandomQuote() {
      return quotes.quotes[Math.floor(Math.random() * quotes.quotes.length)];
    },

    async copyToClipboard() {
      if (!this.currentQuote) return;

      const {text, author, contributor, link} = this.currentQuote;
      const parts = [
        text,
        author && `作者：${author}`,
        contributor && `贡献者：${contributor}`,
        (link || contributor) && `来源：${link || `https://github.com/${contributor}`}`
      ].filter(Boolean);

      try {
        await navigator.clipboard.writeText(parts.join('\n'));
      } catch (err) {
        console.error("复制失败:", err);
      }
    }
  }
};
</script>

<style scoped>
.source-text, .contributor {
  opacity: 0.7;
  font-size: 0.9em;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-apple);
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
