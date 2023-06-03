<template>
  <e-root>
    <e-title>{{ t("web.title") }}</e-title>
    <input ref="fileInput" type="file" accept="image/*" @change="load" />
    <img :src="connected ? dataURL ?? Icon : Icon" />
    <e-input v-if="connected">
      <e-status>
        {{ status === "ready" ? "" : t(`web.status.${status}`) }}
      </e-status>
      <button @click="select">{{ t("web.selectButton") }}</button>
      <button @click="upload" v-if="dataURL">{{ t("web.uploadButton") }}</button>
    </e-input>
    <e-input v-else>
      <e-status>{{ t("web.noConnections") }} </e-status>
    </e-input>
  </e-root>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { WEBHOOK_PORT } from "@/commons/defines";
import { IpcFunctions } from "@/commons/ipc/ipcFunctions";

import Icon from "@/_public/images/app/icon.png";

const { t } = useI18n();
const fileInput = ref<HTMLInputElement>();
const dataURL = ref<string | undefined>();
const uploading = ref(false);
const status = ref<"successful" | "progress" | "failed" | "ready">("ready");
const connected = ref(true);
onMounted(async () => {
  let alive = true;
  setInterval(() => {
    if (alive) {
      alive = false;
    } else {
      connected.value = false;
    }
  }, 2000);
  setInterval(async () => {
    const info = await send("getAppInfo");
    if (info.version !== undefined) {
      alive = true;
      connected.value = true;
    }
  }, 1000);
});
function select() {
  fileInput.value?.click();
}
async function load() {
  const file = fileInput.value?.files?.[0];
  if (file === undefined) {
    return;
  }
  dataURL.value = undefined;
  try {
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
  } catch {
    //
  }
}
async function upload() {
  if (dataURL.value === undefined) {
    return;
  }
  status.value = "progress";
  uploading.value = true;
  try {
    const result = await send("importFiles", [
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
    if (result.length > 0) {
      status.value = "successful";
    } else {
      status.value = "failed";
    }
  } catch {
    status.value = "failed";
  }
  uploading.value = false;
}
async function send<U extends keyof IpcFunctions>(
  event: U,
  ...args: Parameters<IpcFunctions[U]>
): Promise<Awaited<ReturnType<IpcFunctions[U]>>> {
  const response = await fetch("http://" + location.host.split(":")[0] + `:${WEBHOOK_PORT}/api`, {
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
    border-radius: var(--rounded);
  }
  > input {
    display: none;
  }
  > e-input {
    display: flex;
    align-items: center;
    flex-direction: column;
    > e-status {
      white-space: pre-wrap;
      overflow: hidden;
    }
  }
}
</style>
<style lang="scss">
@import "@/renderer/styles/index.scss";
</style>
