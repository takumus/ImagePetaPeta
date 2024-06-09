<template>
  <e-task-root>
    <p v-if="name !== ''">{{ t(name) }}({{ Math.floor(progress) }}%)</p>
    <VProgressBar :progress="progress"></VProgressBar>
    <pre class="log">{{ log }}</pre>
    <e-cancel>
      <button tabindex="-1" @click="cancel" v-if="cancelable">
        {{ t("fileImporter.cancel") }}
      </button>
    </e-cancel>
  </e-task-root>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VProgressBar from "@/renderer/components/commons/utils/progressBar/VProgressBar.vue";

import { TaskStatusCode, TaskStatusWithIndex } from "@/commons/datas/task";

import { IPC } from "@/renderer/libs/ipc";

const props = defineProps<{
  taskStatus: TaskStatusWithIndex & { id: string };
}>();
const { t } = useI18n();
const progress = ref(100);
const status = ref<TaskStatusCode>("complete");
const currentTaskId = ref("");
const prevIndex = ref(-1);
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
  if (currentTaskId.value !== task.id) {
    log.value = "";
    progress.value = 100;
    prevIndex.value = -1;
  }
  if (prevIndex.value == task.index) {
    return;
  }
  prevIndex.value = task.index;
  currentTaskId.value = task.id;
  // window.clearTimeout(closeWindowHandler);
  name.value = task.i18nKey + ".name";
  progress.value = task.progress
    ? Math.floor((task.progress.current / task.progress.all) * 100)
    : 0;
  cancelable.value = task.cancelable === true;
  status.value = task.status;
  const i18nKey = `${task.i18nKey}.logs.${task.status}`;
  const localized = t(i18nKey, task.log ?? []);
  if (task.status === "begin") {
    log.value = "";
  }
  addLog(
    `${
      task.status === "progress" && task.progress
        ? `(${task.progress.current}/${task.progress.all})`
        : ""
    }${localized}`,
  );
  if (task.status === "complete") {
    progress.value = 100;
  }
  if (task.status === "complete" || task.status === "failed") {
    cancelable.value = false;
  }
}
function addLog(value: string) {
  log.value = value + "\n" + log.value;
}
function cancel() {
  IPC.tasks.cancel([currentTaskId.value]);
}
</script>

<style lang="scss" scoped>
e-task-root {
  display: block;
  text-align: center;
  > pre {
    width: 100%;
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
    word-break: break-word;
  }
}
</style>
