<template>
  <t-task-root>
    <p v-if="name !== ''">
      {{$t(name)}}({{Math.floor(progress)}}%)
    </p>
    <VProgressBar :progress="progress"></VProgressBar>
    <pre class="log">{{log}}</pre>
    <t-cancel>
      <button
        tabindex="-1"
        @click="cancel"
        v-if="cancelable">
        {{$t("imageImporter.cancel")}}
      </button>
    </t-cancel>
  </t-task-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VProgressBar from "@/rendererProcess/components/utils/VProgressBar.vue";
// Others
import { API } from "@/rendererProcess/api";
import { Vec2, vec2FromMouseEvent } from "@/commons/utils/vec2";
import * as Cursor from "@/rendererProcess/utils/cursor";
import { TaskStatus, TaskStatusCode } from "@/commons/api/interfaces/task";
@Options({
  components: {
    VProgressBar
  }
})
export default class VTasks extends Vue {
  progress = 100;
  status: TaskStatusCode = "complete";
  currentTaskId = "";
  log = "";
  currentMousePosition = new Vec2();
  cancelable = false;
  name = "";
  closeWindowHandler = -1;
  @Prop()
  taskId!: string;
  @Prop()
  taskStatus!: TaskStatus;
  mounted() {
    this.changeTaskStatus();
  }
  @Watch("taskStatus", { deep: true })
  changeTaskStatus() {
    const task = this.taskStatus;
    this.currentTaskId = this.taskId;
    window.clearTimeout(this.closeWindowHandler);
    this.name = task.i18nKey + ".name";
    this.progress = task.progress ? Math.floor(task.progress.current / task.progress.all * 100) : 0;
    this.cancelable = task.cancelable === true;
    this.status = task.status;
    const i18nKey = `${task.i18nKey}.logs.${task.status}`;
    const localized = this.$t(i18nKey, task.log || []);
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
      this.progress = 100;
      Cursor.setDefaultCursor();
      this.cancelable = false;
    }
  }
  addLog(value: string) {
    this.log = value + "\n" + this.log;
  }
  cancel() {
    API.send("cancelTasks", [this.currentTaskId]);
  }
}
</script>

<style lang="scss" scoped>
t-task-root {
  text-align: center;
  display: block;
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