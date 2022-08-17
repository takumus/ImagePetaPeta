<template>
  <t-dialog-root
    v-show="visible"
    :style=" {
      zIndex: zIndex
    }"
  >
    <t-modal>
      <t-content>
        <p>
          {{label}}
        </p>
        <t-buttons>
          <button
            v-for="(item, index) in items"
            :key="item"
            @click="select(index)"
            tabindex="-1"
          >
            {{item}}
          </button>
        </t-buttons>
      </t-content>
    </t-modal>
  </t-dialog-root>
</template>

<script setup lang="ts">
// Vue
import { ref, watch, getCurrentInstance, onMounted, nextTick } from "vue";

const _this = getCurrentInstance()!.proxy!;
defineProps<{
  zIndex: number
}>();

const items = ref<string[]>([]);
const label = ref("");
const visible = ref(false);
let resolve: (index: number) => void = (index: number) => index;
onMounted(() => {
  _this.$components.dialog = _this as any;
});
function select(index: number) {
  resolve(index);
  visible.value = false;
}
function show(_label: string, _items: string[]) {
  if (visible.value) {
    resolve(-1);
  }
  visible.value = true;
  label.value = _label;
  items.value = _items;
  return new Promise<number>((res) => {
    resolve = res;
  });
}
// (_this as any).show = show;
</script>

<style lang="scss" scoped>
t-dialog-root {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0px;
  left: 0px;
  background-color: var(--color-modal);
  color: var(--color-font);
  overflow: hidden;
  display: block;
  &.no-background {
    background-color: transparent;
  }
  >t-modal {
    background-color: var(--color-main);
    padding: 16px;
    border-radius: var(--rounded);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    >t-content {
      flex: 1;
      overflow: hidden;
      text-align: center;
      display: block;
      >p {
        text-align: center;
        word-break: break-word;
        white-space: pre-wrap;
      }
      >t-buttons {
        display: block;
      }
    }
  }
}
</style>