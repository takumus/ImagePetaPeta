<template>
  <e-window-root>
    <e-title>{{ t("web.title") }}</e-title>
    <input ref="fileInput" type="file" multiple accept="image/*" />
    <e-input v-if="connected">
      <e-status>
        {{ status === "ready" ? "" : t(`web.status.${status}`) }}
      </e-status>
      <button @click="select">{{ t("web.selectButton") }}</button>
      <button @click="upload">{{ t("web.uploadButton") }}</button>
    </e-input>
    <e-input v-else>
      <e-status>{{ t("web.noConnections") }} </e-status>
    </e-input>
  </e-window-root>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { WEBHOOK_PORT } from "@/commons/defines";
import { IpcFunctions } from "@/commons/ipc/ipcFunctions";
import { ppa } from "@/commons/utils/pp";

// import Icon from "@/_public/images/app/icon.png";

const { t } = useI18n();
const fileInput = ref<HTMLInputElement>();
const uploading = ref(false);
const status = ref<"successful" | "progress" | "failed" | "ready">("ready");
const connected = ref(true);
const apiKey = ref("");
onMounted(async () => {
  apiKey.value = location.search.split("?webAPIKey=")[1];
  // window.history.replaceState(null, "", "/web");
  let alive = true;
  setInterval(() => {
    if (alive) {
      alive = false;
    } else {
      connected.value = false;
    }
  }, 2000);
  setInterval(async () => {
    const info = await send("common", "getAppInfo");
    if ("response" in info) {
      if (info.response.version !== undefined) {
        alive = true;
        connected.value = true;
      }
    }
  }, 1000);
});
function select() {
  fileInput.value?.click();
}

async function loadFile(file: File) {
  return new Promise<string>((res, rej) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      res(reader.result as string);
    };
    reader.onerror = () => {
      rej("error");
    };
    reader.readAsDataURL(file);
  }).then((dataUrl) => {
    return {
      dataURL: dataUrl,
      filename: file.name,
    };
  });
}

async function upload() {
  const files = Array.from(fileInput.value?.files || []);
  if (files === undefined || files.length == 0) {
    return;
  }

  status.value = "progress";
  uploading.value = true;
  try {
    const results = await ppa(async (file) => {
      const data = await loadFile(file);
      return send("importer", "import", [
        [
          {
            type: "url",
            url: data.dataURL,
            additionalData: {
              name: data.filename,
              note: t("web.title"),
            },
          },
        ],
      ]);
    }, files).promise;

    const responseLengthList = results.map((result) => {
      if ("error" in result) {
        throw result.error;
      }
      return result.response.length;
    });

    if (!responseLengthList.includes(0)) {
      status.value = "successful";
    } else {
      status.value = "failed";
    }
  } catch {
    status.value = "failed";
  }
  uploading.value = false;
}
async function send<C extends keyof IpcFunctions, U extends keyof IpcFunctions[C]>(
  category: C,
  event: U,
  ...args: Parameters<FunctionGuard<IpcFunctions[C][U]>>
): Promise<
  | {
      response: Awaited<ReturnType<FunctionGuard<IpcFunctions[C][U]>>>;
    }
  | { error: string }
> {
  const response = await fetch("http://" + location.host.split(":")[0] + `:${WEBHOOK_PORT}/api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "impt-web-api-key": apiKey.value,
    },
    body: JSON.stringify({
      event: `${category}.${event as any}`,
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
  margin: 0px;
  background-color: var(--color-0);
  padding: 0px;
  width: 100%;
  height: 100%;
  font-size: 24px;
  font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo,
    sans-serif;
  user-select: none;
}
e-window-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--px-3);
  padding: var(--px-3);
  height: 100%;
  color: var(--color-font);
  > img {
    display: block;
    border-radius: var(--rounded);
    max-width: 60%;
    max-height: 50%;
  }
  > input {
    display: none;
  }
  > e-input {
    display: flex;
    flex-direction: column;
    align-items: center;
    > e-status {
      overflow: hidden;
      white-space: pre-wrap;
    }
  }
}
</style>
<style lang="scss">
@import "@/renderer/styles/index.scss";
</style>
