<template>
  <VModal
    :visible="data.loading || data.extracting"
    :center="true"
    :defaultZIndex="zIndex"
    :ignore="true">
    <t-board-loading-root>
      <p>{{ t("boards.extracting") }}{{ Math.floor(data.extractProgress) }}%</p>
      <VProgressBar :progress="data.extractProgress"></VProgressBar>
      <p>{{ t("boards.loading") }}{{ Math.floor(data.loadProgress) }}%</p>
      <VProgressBar :progress="data.loadProgress"></VProgressBar>
      <pre class="log">{{ data.log }}</pre>
    </t-board-loading-root>
  </VModal>
</template>

<script setup lang="ts">
// Components
import { useI18n } from "vue-i18n";

import VModal from "@/renderer/components/commons/utils/modal/VModal.vue";
import VProgressBar from "@/renderer/components/commons/utils/progressBar/VProgressBar.vue";

import { VBoardLoadingStatus } from "@/renderer/components/board/loading/vBoardLoadingStatus";

const { t } = useI18n();

defineProps<{
  zIndex: number;
  data: VBoardLoadingStatus;
}>();
</script>

<style lang="scss" scoped>
t-board-loading-root {
  text-align: center;
  > .log {
    text-align: left;
    overflow: hidden;
    word-break: break-word;
    white-space: pre-wrap;
    height: 64px;
    overflow-y: auto;
    overflow-x: hidden;
    font-size: var(--size-0);
  }
  > p {
    word-break: break-word;
    white-space: pre-wrap;
  }
}
</style>
