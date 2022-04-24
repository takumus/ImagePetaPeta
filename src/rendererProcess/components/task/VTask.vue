<template>
  <VModal
    :visible="visible"
    :center="true"
    :visibleCloseButton="false"
  >
    <article class="task-root">
      <p v-if="name !== ''">
        {{$t(name)}}({{Math.floor(progress)}}%)
      </p>
      <VProgressBar :progress="progress"></VProgressBar>
      <pre class="log">{{log}}</pre>
      <section class="confirms">
        <button
          tabindex="-1"
          @click="cancel"
          v-if="cancelable">
          {{$t("imageImporter.cancel")}}
        </button>
        <button
          tabindex="-1"
          @click="ok"
          v-if="failed">
          {{$t("shared.closeButton")}}
        </button>
      </section>
    </article>
  </VModal>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VModal from "@/rendererProcess/components/modal/VModal.vue";
import VProgressBar from "@/rendererProcess/components/utils/VProgressBar.vue";
// Others
import { getURLFromImgTag } from "@/rendererProcess/utils/getURLFromImgTag";
import { API } from "@/rendererProcess/api";
import { Vec2, vec2FromMouseEvent } from "@/commons/utils/vec2";
import * as Cursor from "@/rendererProcess/utils/cursor";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { TaskStatus, TaskStatusCode } from "@/commons/api/interfaces/task";
@Options({
  components: {
    VModal,
    VProgressBar
  },
  emits: [
    "addPanelByDragAndDrop"
  ]
})
export default class VTask extends Vue {
  progress = 100;
  status: TaskStatusCode = "complete";
  currentTaskId = "";
  visible = false;
  log = "";
  currentMousePosition = new Vec2();
  cancelable = false;
  name = "";
  closeWindowHandler = -1;
  mounted() {
    API.on("taskStatus", (e, id, task) => {
      this.currentTaskId = id;
      window.clearTimeout(this.closeWindowHandler);
      this.name = task.i18nKey + ".name";
      this.progress = task.progress ? Math.floor(task.progress.current / task.progress.all * 100) : 0;
      this.cancelable = task.cancelable === true;
      this.status = task.status;
      this.visible = true;
      const i18nKey = `${task.i18nKey}.logs.${task.status}`;
      const localized = this.$t(i18nKey, task.log);
      if (localized.indexOf("undefined") >= 0) {
        console.warn(i18nKey, "にundefinedが含まれています。怪しい。");
        console.warn(localized);
      }
      if (task.status == "begin") {
        this.log = "";
      }
      this.addLog(`[${task.status}]${
        task.status == "progress" && task.progress ? `(${task.progress.current}/${task.progress.all})` : ""
      }:${localized}`);
      Cursor.setCursor("wait");
      if (task.status == "complete" || task.status == "failed") {
        if (task.status == "complete") {
          this.closeWindowHandler = window.setTimeout(() => {
            this.visible = false;
          }, 200);
        }
        this.progress = 100;
        Cursor.setDefaultCursor();
        this.cancelable = false;
      }
    });
  }
  addLog(value: string) {
    this.log = value + "\n" + this.log;
  }
  ok() {
    this.visible = false;
  }
  get failed() {
    return this.status == "failed";
  }
  cancel() {
    API.send("cancelTasks", [this.currentTaskId]);
  }
}
</script>

<style lang="scss" scoped>
.task-root {
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