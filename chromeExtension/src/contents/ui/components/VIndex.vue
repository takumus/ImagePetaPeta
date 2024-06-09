<template>
  <e-window-root v-show="show">
    <e-menu
      ref="menu"
      :style="{
        left: menuPosition.x + 'px',
        top: menuPosition.y + 'px',
      }">
      <e-icon>
        <!-- <img :src="icon" /> -->
        <e-label>ImagePetaPeta</e-label>
      </e-icon>
      <e-buttons>
        <VImageButtons :urls="urls" :img-info="imgInfo" @save="save" />
      </e-buttons>
    </e-menu>
    <VBoxes :image-parser-result="currentImageParseResult" />
    <e-background ref="background"></e-background>
  </e-window-root>
</template>
<script setup lang="ts">
import VImageButtons from "./VImageButtons.vue";
import { ImageInfo } from "$/@types/imageInfo";
import { MessagesToContent } from "$/commons/messages";
import { sendToBackground } from "$/commons/sendToBackground";
import VBoxes from "$/contents/ui/components/VBoxes.vue";
import { getData, ImageParserResult } from "$/contents/ui/imageParser";
import { injectedDataStoreKey } from "$/contents/ui/injectedData";
import { inject, onMounted, ref } from "vue";

const urls = ref<string[]>([]);
const imgInfo = ref<{ [url: string]: ImageInfo | undefined }>({});
const show = ref(false);
const background = ref<HTMLElement>();
const menu = ref<HTMLElement>();
const menuPosition = ref({ x: 0, y: 0 });
const menuTargetPosition = ref({ x: 0, y: 0 });
const mousePosition = ref({ x: 0, y: 0 });
const injectedData = inject(injectedDataStoreKey);
if (injectedData === undefined) {
  throw "impt inject error";
}
let currentImageParseResult = ref<ImageParserResult[]>([]);
async function save(url: string) {
  let urls = [url];
  await sendToBackground("orderSave", urls, window.location.origin, window.navigator.userAgent, {
    name: document.title,
    note: location.href,
  });
  const result = await sendToBackground("save");
  if (result !== undefined && result.length > 0) {
    const info = imgInfo.value[url];
    if (info !== undefined) {
      info.saveState = "saved";
    }
  }
}
async function select(x: number, y: number) {
  menuTargetPosition.value = { x, y };
  currentImageParseResult.value = getData({ x, y });
  urls.value = Array.from(
    new Set(currentImageParseResult.value.reduce<string[]>((p, c) => [...c.urls, ...p], [])),
  );
  imgInfo.value = urls.value.reduce<{ [url: string]: ImageInfo }>((p, c) => {
    return {
      [c]: imgInfo.value[c] ?? {
        width: 0,
        height: 0,
        loaded: false,
        type: "unknown",
        saveState: "none",
      },
      ...p,
    };
  }, {});
  console.log(currentImageParseResult.value);
  if (currentImageParseResult.value.length === 0) {
    hide();
    return;
  }
  show.value = true;
  updateBoxes();
  updateMenuPosition();
}
function updateBoxes(updateRect = false) {
  if (updateRect) {
    currentImageParseResult.value.forEach((r) => {
      r.rect = r.element.getBoundingClientRect();
    });
  }
}
function updateMenuPosition(optionalRect?: DOMRect) {
  if (show.value && menu.value) {
    const rect = optionalRect ?? menu.value.getBoundingClientRect();
    let { x, y } = menuTargetPosition.value;
    if (window.innerWidth < rect.width + menuTargetPosition.value.x) {
      x = menuTargetPosition.value.x - rect.width;
    }
    if (window.innerHeight < rect.height + menuTargetPosition.value.y) {
      y = menuTargetPosition.value.y - rect.height;
    }
    menuPosition.value = { x, y };
  }
}
function hide() {
  show.value = false;
}
onMounted(() => {
  let enabledRightClick = false;
  const ub = () => {
    updateBoxes(true);
    updateMenuPosition();
    requestAnimationFrame(ub);
  };
  ub();
  if (menu.value) {
    new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        updateMenuPosition(rect);
      }
    }).observe(menu.value);
  }
  // overlay.captureButton.addEventListener("click", async () => {
  //   overlay.setStatus("saving");
  //   const domRect = clickedElement?.rect;
  //   overlay.hide();
  //   clickedElement = undefined;
  //   await new Promise((res) => {
  //     setTimeout(res, 1000 / 30);
  //   });
  //   const rect = (() => {
  //     if (domRect === undefined) {
  //       return undefined;
  //     }
  //     const normalizedRect = {
  //       width: domRect.width / window.innerWidth,
  //       height: domRect.height / window.innerHeight,
  //       x: domRect.x / window.innerWidth,
  //       y: domRect.y / window.innerHeight,
  //     };
  //     const x = Math.max(Math.min(normalizedRect.x, 1), 0);
  //     const y = Math.max(Math.min(normalizedRect.y, 1), 0);
  //     const width = Math.max(
  //       Math.min(
  //         normalizedRect.width - (normalizedRect.x < 0 ? -normalizedRect.x : 0),
  //         1 - x
  //       ),
  //       0
  //     );
  //     const height = Math.max(
  //       Math.min(
  //         normalizedRect.height -
  //           (normalizedRect.y < 0 ? -normalizedRect.y : 0),
  //         1 - y
  //       ),
  //       0
  //     );
  //     return {
  //       x,
  //       y,
  //       width,
  //       height,
  //     };
  //   })();
  //   const result = await sendToBackground("capture", location.href, rect);
  //   if (result) {
  //     overlay.setStatus("saved");
  //   } else {
  //     overlay.setStatus("failed");
  //   }
  // });
  window.document.addEventListener(
    "contextmenu",
    (event) => {
      if (!enabledRightClick) {
        return;
      }
      event.preventDefault();
      select(event.clientX, event.clientY);
    },
    true,
  );
  background.value?.addEventListener("click", hide);
  window.document.addEventListener("mousemove", (event) => {
    mousePosition.value.x = event.clientX;
    mousePosition.value.y = event.clientY;
  });
  const messageFunctions: MessagesToContent = {
    openMenu: async () => {
      select(mousePosition.value.x, mousePosition.value.y);
    },
    requestPageDownloaderDatas: async () => {
      //
    },
  };
  setInterval(async () => {
    // enabledRightClick = await sendToBackground("getRightClickEnable");
  }, 100);
  chrome.runtime.onMessage.addListener((request, _, response) => {
    (messageFunctions as any)[request.type](...request.args).then((res: any) => {
      response({
        value: res,
      });
    });
    return true;
  });
});
</script>
<style lang="scss">
*,
*:before,
*:after {
  all: initial;
  box-sizing: border-box;
  font-size: 16px;
  line-height: 16px;
  font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo,
    sans-serif;
  user-select: none;
}
*::-webkit-scrollbar {
  width: var(--px-2);
}
*::-webkit-scrollbar-thumb {
  border-radius: var(--rounded);
  background-color: var(--color-border);
  min-height: var(--px-3);
}
e-window-root {
  display: block;
  position: absolute !important;
  top: 0px !important;
  left: 0px !important;
  background-color: unset !important;
  width: 0px !important;
  height: 0px !important;
  > e-background {
    position: fixed;
    top: 0px;
    left: 0px;
    z-index: 2147483645;
    background-color: var(--color-overlay);
    width: 100%;
    height: 100%;
  }
  > e-menu {
    display: flex;
    position: fixed;
    flex-direction: column;
    align-items: center;
    gap: var(--px-2);
    opacity: 0.95;
    z-index: 2147483647;
    box-shadow: var(--shadow-floating);
    border-radius: var(--rounded);
    background-color: var(--color-0-floating);
    padding: var(--px-2);
    width: 40%;
    height: 50%;
    overflow: hidden;
    pointer-events: auto;
    > e-icon {
      display: flex;
      flex-direction: row;
      justify-content: left;
      align-items: center;
      gap: var(--px-2);
      width: 100%;
      height: 32px;
      > e-label {
        color: var(--color-font);
      }
      > img {
        display: block;
        height: 100%;
      }
    }
    > e-buttons {
      display: flex;
      flex: 1;
      flex-direction: column;
      width: 100%;
      overflow: hidden;
    }
  }
}
</style>
<style lang="scss">
@import "@/renderer/styles/index.scss";
</style>
