<template>
  <VModal
    :visible="visible"
    :center="true"
    :visibleCloseButton="false"
  >
    <t-tasks-root>
      <t-tasks>
        <VTask
          v-for="t in taskStatusArray"
          :key="t.id"
          :taskId="t.id"
          :taskStatus="t.status"
        />
      </t-tasks>
      <button
        tabindex="-1"
        @click="close"
        v-if="closable">
        {{$t("shared.closeButton")}}
      </button>
    </t-tasks-root>
  </VModal>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VModal from "@/rendererProcess/components/modal/VModal.vue";
import VProgressBar from "@/rendererProcess/components/utils/VProgressBar.vue";
import VTask from "@/rendererProcess/components/task/VTask.vue";
// Others
import { API } from "@/rendererProcess/api";
import { TaskStatus } from "@/commons/api/interfaces/task";
@Options({
  components: {
    VModal,
    VTask,
    VProgressBar
  },
  emits: []
})
export default class VTasks extends Vue {
  taskStatuses: {[key: string]: TaskStatus} = {};
  mounted() {
    API.on("taskStatus", (e, id, task) => {
      this.taskStatuses[id] = task;
      if (task.status == "complete") {
        window.setTimeout(() => {
          delete this.taskStatuses[id];
        }, 200);
      }
    });
  }
  get taskStatusArray() {
    return Object.keys(this.taskStatuses).reverse().map((id) => ({
      id,
      status: this.taskStatuses[id]
    }))
  }
  get visible() {
    return this.taskStatusArray.length > 0 && (this.$focusedWindows.isMainWindow || this.$focusedWindows.focused);
  }
  get closable() {
    return Object.values(this.taskStatuses).filter((status) => {
      return status.status == "complete" || status.status === "failed";
    }).length == this.taskStatusArray.length;
  }
  close() {
    Object.keys(this.taskStatuses).filter((id) => this.taskStatuses[id]?.status === "failed").forEach((key) => {
      delete this.taskStatuses[key];
    });
  }
}
</script>

<style lang="scss" scoped>
t-tasks-root {
  text-align: center;
  display: block;
  >t-tasks {
    width: 100%;
    max-height: 512px;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 4px;
    display: block;
  }
}
</style>