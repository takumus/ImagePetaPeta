<template>
  <t-task-root>
    <p v-if="name !== ''">{{ t(name) }}({{ Math.floor(progress) }}%)</p>
    <VProgressBar :progress="progress"></VProgressBar>
    <pre class="log">{{ log }}</pre>
    <t-cancel>
      <button tabindex="-1" @click="cancel" v-if="cancelable">
        {{ t("imageImporter.cancel") }}
      </button>
    </t-cancel>
  </t-task-root>
</template>

<script setup lang="ts">
// Vue
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

// Components
import VProgressBar from "@/renderer/components/commons/utils/progressBar/VProgressBar.vue";

import { TaskStatus, TaskStatusCode } from "@/commons/datas/task";

// Others
import { IPC } from "@/renderer/libs/ipc";
import * as Cursor from "@/renderer/utils/cursor";

const props = defineProps<{
  taskId: string;
  taskStatus: TaskStatus;
}>();
const { t } = useI18n();
const progress = ref(100);
const status = ref<TaskStatusCode>(TaskStatusCode.COMPLETE);
const currentTaskId = ref("");
const log = ref("");
const cancelable = ref(false);
const name = ref("");
// let closeWindowHandler = -1;
onMounted(() => {
  changeTaskStatus();
});
watch(
  () => props.taskStatus,
  () => {
    changeTaskStatus();
  },
  { deep: true },
);
function changeTaskStatus() {
  const task = props.taskStatus;
  currentTaskId.value = props.taskId;
  // window.clearTimeout(closeWindowHandler);
  name.value = task.i18nKey + ".name";
  progress.value = task.progress
    ? Math.floor((task.progress.current / task.progress.all) * 100)
    : 0;
  cancelable.value = task.cancelable === true;
  status.value = task.status;
  const i18nKey = `${task.i18nKey}.logs.${task.status}`;
  const localized = t(i18nKey, task.log ?? []);
  if (task.status === TaskStatusCode.BEGIN) {
    log.value = "";
  }
  addLog(
    `[${task.status}]${
      task.status === TaskStatusCode.PROGRESS && task.progress
        ? `(${task.progress.current}/${task.progress.all})`
        : ""
    }:${localized}`,
  );
  Cursor.setCursor("wait");
  if (task.status === TaskStatusCode.COMPLETE) {
    progress.value = 100;
  }
  if (task.status === TaskStatusCode.COMPLETE || task.status === TaskStatusCode.FAILED) {
    Cursor.setDefaultCursor();
    cancelable.value = false;
  }
}
function addLog(value: string) {
  log.value = value + "\n" + log.value;
}
function cancel() {
  IPC.send("cancelTasks", [currentTaskId.value]);
}
</script>

<style lang="scss" scoped>
t-task-root {
  text-align: center;
  display: block;
  > pre {
    width: 100%;
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
  }
}
</style>
