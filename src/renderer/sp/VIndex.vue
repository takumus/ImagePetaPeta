<template>
  <e-root>
    <input ref="fileInput" type="file" accept="image/*" @change="load" />
    <img v-if="dataURL" :src="dataURL" />
    <e-log>
      {{ log }}
    </e-log>
    <button @click="select">ファイルを選ぶ</button>
    <button @click="upload" v-if="dataURL">アップロード</button>
  </e-root>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { IpcFunctions } from "@/commons/ipc/ipcFunctions";

const { t } = useI18n();
const fileInput = ref<HTMLInputElement>();
const dataURL = ref<string | undefined>();
const uploading = ref(false);
const log = ref("(^o^)");
onMounted(async () => {});
function select() {
  fileInput.value?.click();
}
async function load() {
  const file = fileInput.value?.files?.[0];
  if (file === undefined) {
    return;
  }
  dataURL.value = await new Promise<string>((res, rej) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      res(reader.result as string);
    };
    reader.onerror = () => {
      rej("error");
    };
    reader.readAsDataURL(file);
  });
}
async function upload() {
  if (dataURL.value === undefined) {
    return;
  }
  log.value = "アップロード中...";
  uploading.value = true;
  try {
    await send("importFiles", [
      [
        {
          type: "url",
          url: dataURL.value,
          additionalData: {
            note: "from sp",
          },
        },
      ],
    ]);
    log.value = "完了!";
  } catch {
    log.value = "失敗...!";
  }
  uploading.value = false;
}
async function send<U extends keyof IpcFunctions>(
  event: U,
  ...args: Parameters<IpcFunctions[U]>
): Promise<Awaited<ReturnType<IpcFunctions[U]>>> {
  const response = await fetch("http://" + location.host.split(":")[0] + ":51915/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event,
      args,
    }),
  });
  return response.json();
}
</script>

<style lang="scss">
*,
*:before,
*:after {
  box-sizing: border-box;
}
body,
html,
#app {
  width: 100%;
  height: 100%;
  user-select: none;
  margin: 0px;
  padding: 0px;
  font-size: 24px;
  font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo,
    sans-serif;
  background-color: var(--color-0);
}
e-root {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  padding: var(--px-3);
  color: var(--color-font);
  gap: var(--px-3);
  > img {
    display: block;
    max-width: 60%;
    max-height: 50%;
  }
  > input {
    display: none;
  }
  > e-log {
    white-space: pre-wrap;
    overflow: hidden;
  }
}
</style>
<style lang="scss">
@import "@/renderer/styles/index.scss";
</style>
