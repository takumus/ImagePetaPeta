<template>
  <VModal :visible="visible" :center="true" :visibleCloseButton="false">
    <t-tasks-root>
      <t-tasks>
        <VTask v-for="t in taskStatusArray" :key="t.id" :taskId="t.id" :taskStatus="t.status" />
      </t-tasks>
      <button tabindex="-1" @click="close" v-if="closable">
        {{ t("commons.closeButton") }}
      </button>
    </t-tasks-root>
  </VModal>
</template>

<script setup lang="ts">
// Vue
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import VTask from "@/renderer/components/task/VTask.vue";
// Components
import VModal from "@/renderer/components/utils/modal/VModal.vue";

import { TaskStatus, TaskStatusCode } from "@/commons/datas/task";
import { TASK_CLOSE_DELAY } from "@/commons/defines";

// Others
import { IPC } from "@/renderer/ipc";
import { useWindowStatusStore } from "@/renderer/stores/windowStatusStore/useWindowStatusStore";

const windowStatus = useWindowStatusStore();
const { t } = useI18n();
const taskStatuses = ref<{ [key: string]: TaskStatus }>({});
onMounted(() => {
  IPC.on("taskStatus", (e, id, task) => {
    taskStatuses.value[id] = task;
    if (task.status === TaskStatusCode.COMPLETE) {
      window.setTimeout(() => {
        delete taskStatuses.value[id];
      }, TASK_CLOSE_DELAY);
    }
  });
});
const taskStatusArray = computed(() => {
  return Object.keys(taskStatuses.value)
    .reverse()
    .map((id) => ({
      id,
      status: taskStatuses.value[id] as TaskStatus,
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
      return status.status === TaskStatusCode.COMPLETE || status.status === TaskStatusCode.FAILED;
    }).length === taskStatusArray.value.length
  );
});
function close() {
  Object.keys(taskStatuses.value)
    .filter((id) => taskStatuses.value[id]?.status === TaskStatusCode.FAILED)
    .forEach((key) => {
      delete taskStatuses.value[key];
    });
}
</script>

<style lang="scss" scoped>
t-tasks-root {
  text-align: center;
  display: block;
  > t-tasks {
    width: 100%;
    max-height: 512px;
    overflow-x: hidden;
    overflow-y: auto;
    padding: var(--px-1);
    display: block;
  }
}
</style>
