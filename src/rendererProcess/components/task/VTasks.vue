<template>
  <VModal :visible="visible" :center="true" :visibleCloseButton="false">
    <t-tasks-root>
      <t-tasks>
        <VTask v-for="t in taskStatusArray" :key="t.id" :taskId="t.id" :taskStatus="t.status" />
      </t-tasks>
      <button tabindex="-1" @click="close" v-if="closable">
        {{ t("shared.closeButton") }}
      </button>
    </t-tasks-root>
  </VModal>
</template>

<script setup lang="ts">
// Vue
import { computed, onMounted, ref } from "vue";
// Components
import VModal from "@/rendererProcess/components/modal/VModal.vue";
import VTask from "@/rendererProcess/components/task/VTask.vue";
// Others
import { API } from "@/rendererProcess/api";
import { TaskStatus } from "@/commons/api/interfaces/task";
import { useWindowStatusStore } from "@/rendererProcess/stores/windowStatusStore";
import { useI18n } from "vue-i18n";

const windowStatus = useWindowStatusStore();
const { t } = useI18n();
const taskStatuses = ref<{ [key: string]: TaskStatus }>({});
onMounted(() => {
  API.on("taskStatus", (e, id, task) => {
    taskStatuses.value[id] = task;
    if (task.status === "complete") {
      window.setTimeout(() => {
        delete taskStatuses.value[id];
      }, 500);
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
      return status.status === "complete" || status.status === "failed";
    }).length === taskStatusArray.value.length
  );
});
function close() {
  Object.keys(taskStatuses.value)
    .filter((id) => taskStatuses.value[id]?.status === "failed")
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
    padding: 4px;
    display: block;
  }
}
</style>
