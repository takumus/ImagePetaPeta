<template>
  <VModal
    :visible="loading"
    :center="true"
    :zIndex="zIndex"
  >
    <t-board-loading-root>
      <p>
        {{$t("boards.loading")}}{{Math.floor(progress)}}%
      </p>
      <VProgressBar :progress="progress"></VProgressBar>
      <pre class="log">{{log}}</pre>
    </t-board-loading-root>
  </VModal>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref } from "vue-property-decorator";
// Components
import VModal from "@/rendererProcess/components/modal/VModal.vue";
import VProgressBar from "@/rendererProcess/components/utils/VProgressBar.vue";
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
t-board-loading-root {
  text-align: center;
  >.log {
    text-align: left;
    overflow: hidden;
    word-break: break-word;
    height: 64px;
    overflow-y: auto;
    overflow-x: hidden;
    font-size: 0.8em;
  }
  >p {
    word-break: break-word;
  }
}
</style>