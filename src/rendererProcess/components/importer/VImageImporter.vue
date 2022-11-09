<template>
  <section v-if="false"></section>
</template>

<script setup lang="ts">
// Vue
import { onMounted } from "vue";
// Others
import { API } from "@/rendererProcess/api";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { Buffer } from "buffer";
import { ppa } from "@/commons/utils/pp";
const emit = defineEmits<{
  (e: "addPanelByDragAndDrop", ids: string[], position: Vec2, fromBrowser: boolean): void;
}>();

let currentMousePosition = new Vec2();
onMounted(() => {
  document.addEventListener("drop", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      API.send("windowActivate");
      const htmls: string[] = [];
      const html = event.dataTransfer.getData("text/html");
      if (html !== "") {
        htmls.push(html);
      }
      const data = await getDataFromFileList(event.dataTransfer.files);
      const ids = await API.send("importImages", { htmls, ...data });
      emit("addPanelByDragAndDrop", ids, vec2FromPointerEvent(event), false);
    }
  });
  document.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  window.addEventListener("pointermove", (event) => {
    currentMousePosition = vec2FromPointerEvent(event);
  });
  document.addEventListener("paste", async (event) => {
    const mousePosition = currentMousePosition.clone();
    const data = await getDataFromFileList(event.clipboardData?.files);
    const ids = await API.send("importImages", {
      htmls: [],
      ...data,
    });
    emit("addPanelByDragAndDrop", ids, mousePosition, false);
  });
});
async function getDataFromFileList(fileList?: FileList): Promise<{
  buffers: Buffer[];
  filePaths: string[];
}> {
  const items = [...(fileList ?? [])];
  if (items.length === 0) {
    return {
      buffers: [],
      filePaths: [],
    };
  }
  if (items[0]?.path !== "") {
    // パスがあったらファイルパスから読む。
    return {
      buffers: [],
      filePaths: items.map((file) => file.path),
    };
  } else {
    // 無かったらバッファーから読む
    const buffers = (
      await ppa(
        async (item: File) => {
          const data = await item.arrayBuffer();
          if (!data) {
            return undefined;
          }
          return Buffer.from(data);
        },
        [...items],
      ).promise
    ).filter((buffer) => buffer != undefined) as Buffer[];
    return { buffers, filePaths: [] };
  }
}
</script>

<style lang="scss" scoped></style>
