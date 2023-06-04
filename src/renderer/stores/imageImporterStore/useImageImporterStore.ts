import { Buffer } from "buffer";
import { InjectionKey, onUnmounted, readonly, ref } from "vue";
import { onMounted } from "vue";

import { inject } from "@/renderer/utils/vue";

import { ppa } from "@/commons/utils/pp";
import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";

import { IPC } from "@/renderer/libs/ipc";
import { getURLFromHTML } from "@/renderer/utils/getURLFromHTML";

export function useImageImporterStore() {
  const handler = new TypedEventEmitter<{
    addPanelByDragAndDrop: (ids: string[], position: Vec2, fromBrowser: boolean) => void;
  }>();
  let currentMousePosition = new Vec2();
  async function drop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      IPC.send("windowActivate");
      const urls = getURLFromHTML(event.dataTransfer.getData("text/html"));
      const { buffers, filePaths } = await getDataFromFileList(event.dataTransfer.files);
      let ids: string[] = [];
      if (urls !== undefined) {
        ids = await IPC.send("importFiles", [
          [
            ...(urls !== undefined
              ? urls.map(
                  (url) =>
                    ({
                      type: "url",
                      url: url,
                    } as const),
                )
              : []),
            ...(buffers !== undefined
              ? buffers.map(
                  (buffer) =>
                    ({
                      type: "buffer",
                      buffer,
                    } as const),
                  [],
                )
              : []),
          ],
        ]);
      } else {
        ids = await IPC.send(
          "importFiles",
          filePaths !== undefined
            ? filePaths.map((filePath) => [
                {
                  type: "filePath",
                  filePath,
                } as const,
              ])
            : buffers !== undefined
            ? buffers.map((buffer) => [
                {
                  type: "buffer",
                  buffer,
                } as const,
              ])
            : [],
        );
      }
      handler.emit("addPanelByDragAndDrop", ids, vec2FromPointerEvent(event), false);
    }
  }
  async function paste(event: ClipboardEvent) {
    const mousePosition = currentMousePosition.clone();
    const { buffers, filePaths } = await getDataFromFileList(event.clipboardData?.files);
    const ids = await IPC.send(
      "importFiles",
      filePaths !== undefined
        ? filePaths.map((filePath) => [
            {
              type: "filePath",
              filePath,
            } as const,
          ])
        : buffers !== undefined
        ? buffers.map((buffer) => [
            {
              type: "buffer",
              buffer,
            } as const,
          ])
        : [],
    );
    handler.emit("addPanelByDragAndDrop", ids, mousePosition, false);
  }
  function dragover(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }
  function pointerMove(event: PointerEvent) {
    currentMousePosition = vec2FromPointerEvent(event);
  }
  async function getDataFromFileList(fileList?: FileList): Promise<{
    buffers?: Buffer[];
    filePaths?: string[];
  }> {
    const items = Array.from(fileList ?? []);
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
      ).filter((buffer) => buffer !== undefined) as Buffer[];
      return { buffers };
    }
  }
  document.addEventListener("drop", drop);
  document.addEventListener("paste", paste);
  document.addEventListener("dragover", dragover);
  window.addEventListener("pointermove", pointerMove);
  onUnmounted(() => {
    handler.removeAllListeners();
    document.removeEventListener("drop", drop);
    document.removeEventListener("paste", paste);
    document.removeEventListener("dragover", dragover);
    window.removeEventListener("pointermove", pointerMove);
  });
  return {
    events: handler,
  };
}
