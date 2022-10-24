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
      const fileList: File[] = [];
      for (const file of event.dataTransfer.files) {
        fileList.push(file);
      }
      const filePaths = fileList
        .map((file) => file.path)
        .filter((path) => {
          return path.length > 0;
        });
      // 空文字のpathsだったらarraybufferを読む。
      const buffers =
        filePaths.length > 0
          ? []
          : await ppa(async (file) => {
              return file.arrayBuffer();
            }, fileList).promise;
      // const dropFromBrowserPetaImageIds = await API.send("getDropFromBrowserPetaImageIds");
      // if (dropFromBrowserPetaImageIds) {
      //   emit(
      //     "addPanelByDragAndDrop",
      //     dropFromBrowserPetaImageIds,
      //     vec2FromPointerEvent(event),
      //     true,
      //   );
      //   return;
      // }
      const ids = await API.send("importImagesByDragAndDrop", { htmls, buffers, filePaths });
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
    const items = event.clipboardData?.files;
    if (!items || items.length < 1) {
      return;
    }
    const buffers: Buffer[] = [];
    const readBuffer = async (item: File) => {
      const data = await item.arrayBuffer();
      if (!data) {
        return;
      }
      buffers.push(Buffer.from(data));
    };
    await ppa(readBuffer, [...items]).promise;
    const ids = await API.send("importImagesFromClipboard", buffers);
    emit("addPanelByDragAndDrop", ids, mousePosition, false);
  });
});
</script>

<style lang="scss" scoped></style>
