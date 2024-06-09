<template>
  <e-tasks-root>
    <e-tasks>
      <VTask
        v-for="t in taskStatusArray"
        :key="t.status.id"
        :task-id="t.status.id"
        :task-status="t.status" />
    </e-tasks>
    <button tabindex="-1" @click="close" v-if="closable">
      {{ t("commons.closeButton") }}
    </button>
  </e-tasks-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import VTask from "@/renderer/components/task/VTask.vue";

import { TaskStatusWithIndex } from "@/commons/datas/task";

import { IPC } from "@/renderer/libs/ipc";
import { useWindowStatusStore } from "@/renderer/stores/windowStatusStore/useWindowStatusStore";
import * as Cursor from "@/renderer/utils/cursor";

const windowStatus = useWindowStatusStore();
const { t } = useI18n();
const taskStatuses = ref<{ [key: string]: TaskStatusWithIndex }>({});
onMounted(async () => {
  taskStatuses.value = await IPC.tasks.getStatus();
  IPC.on("taskStatus", (e, tasks) => {
    taskStatuses.value = tasks;
    if (
      Object.values(tasks).find((t) => t.status !== "complete" && t.status !== "failed") !==
      undefined
    ) {
      Cursor.setCursor("wait");
    } else {
      Cursor.setDefaultCursor();
    }
  });
});
const taskStatusArray = computed(() => {
  return Object.keys(taskStatuses.value)
    .reverse()
    .map((id) => ({
      status: { id, ...taskStatuses.value[id] },
    }));
});
const visible = computed(() => {
  return (
    taskStatusArray.value.length > 0 &&
    (windowStatus.state.value.isMainWindow || windowStatus.state.value.focused)
  );
});
const closable = computed(() => {
  return (
    Object.values(taskStatuses.value).filter((status) => {
      return status.status === "complete" || status.status === "failed";
    }).length === taskStatusArray.value.length
  );
});
function close() {
  IPC.tasks.confirmFailed(Object.keys(taskStatuses.value));
}
</script>

<style lang="scss" scoped>
e-tasks-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  text-align: center;
  > e-tasks {
    display: block;
    flex: 1;
    padding: var(--px-1);
    width: 100%;
    max-height: 512px;
    overflow-x: hidden;
    overflow-y: auto;
  }
}
</style>
