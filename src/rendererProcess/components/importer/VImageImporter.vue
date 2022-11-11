<template>
  <section v-if="false"></section>
</template>

<script setup lang="ts">
// Vue
import { onMounted } from "vue";
// Others
import { IPC } from "@/rendererProcess/ipc";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { Buffer } from "buffer";
import { ppa } from "@/commons/utils/pp";
import { getURLFromHTML } from "@/rendererProcess/utils/getURLFromHTML";
const emit = defineEmits<{
  (e: "addPanelByDragAndDrop", ids: string[], position: Vec2, fromBrowser: boolean): void;
}>();

let currentMousePosition = new Vec2();
onMounted(() => {
  document.addEventListener("drop", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      IPC.send("windowActivate");
      const html = event.dataTransfer.getData("text/html");
      const data = await getDataFromFileList(event.dataTransfer.files);
      let ids: string[] = [];
      if (html !== "") {
        try {
          ids = await IPC.send("importImages", [
            {
              url: getURLFromHTML(html),
              buffer: data.buffers?.[0],
            },
          ]);
        } catch {
          //
        }
      } else {
        ids = await IPC.send(
          "importImages",
          data.buffers !== undefined
            ? data.buffers.map((buffer) => ({
                buffer,
              }))
            : data.filePaths !== undefined
            ? data.filePaths.map((filePath) => ({
                filePath,
              }))
            : [],
        );
      }
      emit("addPanelByDragAndDrop", ids, vec2FromPointerEvent(event), false);
    }
  });
  document.addEventListener("paste", async (event) => {
    const mousePosition = currentMousePosition.clone();
    const data = await getDataFromFileList(event.clipboardData?.files);
    const ids = await IPC.send(
      "importImages",
      data.buffers !== undefined
        ? data.buffers.map((buffer) => ({
            buffer,
          }))
        : data.filePaths !== undefined
        ? data.filePaths.map((filePath) => ({
            filePath,
          }))
        : [],
    );
    emit("addPanelByDragAndDrop", ids, mousePosition, false);
  });
  document.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  window.addEventListener("pointermove", (event) => {
    currentMousePosition = vec2FromPointerEvent(event);
  });
});
async function getDataFromFileList(fileList?: FileList): Promise<{
  buffers?: Buffer[];
  filePaths?: string[];
}> {
  const items = [...(fileList ?? [])];
  if (items.length === 0) {
    return {};
  }
  if (items[0]?.path !== "") {
    // パスがあったらファイルパスから読む。
    return {
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
    return { buffers };
  }
}
</script>

<style lang="scss" scoped></style>
