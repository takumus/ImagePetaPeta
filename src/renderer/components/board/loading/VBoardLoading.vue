<template>
  <VModal
    :visible="data.loading || data.extracting"
    :center="true"
    :default-z-index="zIndex"
    :ignore="true">
    <e-board-loading-root>
      <p>{{ t("boards.extracting") }}{{ Math.floor(data.extractProgress) }}%</p>
      <VProgressBar :progress="data.extractProgress"></VProgressBar>
      <p>{{ t("boards.loading") }}{{ Math.floor(data.loadProgress) }}%</p>
      <VProgressBar :progress="data.loadProgress"></VProgressBar>
      <pre class="log">{{ data.log }}</pre>
    </e-board-loading-root>
  </VModal>
</template>

<script setup lang="ts">
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
e-board-loading-root {
  text-align: center;
  > .log {
    height: 64px;
    overflow: hidden;
    overflow-x: hidden;
    overflow-y: auto;
    font-size: var(--size-0);
    text-align: left;
    white-space: pre-wrap;
    word-break: break-word;
  }
  > p {
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
