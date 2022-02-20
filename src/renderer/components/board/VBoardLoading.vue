<template>
  <VModal
    :visible="loading"
    :center="true"
    :zIndex="zIndex"
  >
    <article class="board-loading-root">
      <p>
        {{$t("boards.loading")}}{{Math.floor(progress)}}%
      </p>
      <VProgressBar :progress="progress"></VProgressBar>
      <pre class="log">{{log}}</pre>
    </article>
  </VModal>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref } from "vue-property-decorator";
// Components
import VModal from "@/renderer/components/modal/VModal.vue";
import VProgressBar from "@/renderer/components/utils/VProgressBar.vue";
@Options({
  components: {
    VModal,
    VProgressBar
  }
})
export default class VBoardLoading extends Vue {
  @Prop()
  zIndex = 0;
  @Prop()
  progress = 100;
  @Prop()
  log = "";
  @Prop()
  loading = false;
  mounted() {
    //
  }
}
</script>

<style lang="scss" scoped>
.board-loading-root {
  text-align: center;
  .log {
    text-align: left;
    overflow: hidden;
    word-break: break-all;
    white-space: pre-wrap;
    height: 64px;
    overflow-y: auto;
    overflow-x: hidden;
    font-size: 0.8em;
  }
  p {
    white-space: nowrap;
  }
}
</style>