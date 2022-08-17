<template>
  <VModal
    :visible="loading"
    :center="true"
    :defaultZIndex="zIndex"
    :ignore="true"
  >
    <t-board-loading-root>
      <p>
        {{$t("boards.extracting")}}{{Math.floor(extractProgress)}}%
      </p>
      <VProgressBar :progress="extractProgress"></VProgressBar>
      <p>
        {{$t("boards.loading")}}{{Math.floor(loadProgress)}}%
      </p>
      <VProgressBar :progress="loadProgress"></VProgressBar>
      <pre class="log">{{log}}</pre>
    </t-board-loading-root>
  </VModal>
</template>

<script setup lang="ts">
// Components
import VModal from "@/rendererProcess/components/modal/VModal.vue";
import VProgressBar from "@/rendererProcess/components/utils/VProgressBar.vue";

defineProps<{
  zIndex: number,
  extractProgress: number,
  loadProgress: number,
  log: string,
  loading: boolean
}>();
</script>

<style lang="scss" scoped>
t-board-loading-root {
  text-align: center;
  >.log {
    text-align: left;
    overflow: hidden;
    word-break: break-word;
    white-space: pre-wrap;
    height: 64px;
    overflow-y: auto;
    overflow-x: hidden;
    font-size: var(--size-0);
  }
  >p {
    word-break: break-word;
    white-space: pre-wrap;
  }
}
</style>