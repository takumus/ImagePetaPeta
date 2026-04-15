import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { WEBHOOK_PORT } from "@/commons/defines";
import { IpcFunctions } from "@/commons/ipc/ipcFunctions";
import { ppa } from "@/commons/utils/pp";

const rootStyle = css({
  display: "flex",
  height: "100%",
  flexDirection: "column",
  alignItems: "center",
  gap: "px3",
  padding: "px3",
  backgroundColor: "surface",
  color: "text",
});

const hiddenInputStyle = css({
  display: "none",
});

const controlsStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "px2",
});

const titleStyle = css({
  fontSize: "24px",
  lineHeight: "1.2",
  marginTop: "px4",
});

const statusStyle = css({
  whiteSpace: "pre-wrap",
  textAlign: "center",
  lineHeight: "1.5",
});

const buttonRowStyle = css({
  display: "flex",
  gap: "px2",
});

const buttonStyle = css({
  borderWidth: "window",
  borderColor: "border",
  borderRadius: "window",
  backgroundColor: "surfaceMuted",
  paddingX: "px3",
  paddingY: "px2",
  color: "text",
  _hover: {
    backgroundColor: "surfaceEmphasis",
  },
  _disabled: {
    cursor: "not-allowed",
    opacity: 0.5,
  },
});

export default function App() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"successful" | "progress" | "failed" | "ready">("ready");
  const [connected, setConnected] = useState(true);
  const [apiKey] = useState(() => location.search.split("?webAPIKey=")[1] ?? "");

  useEffect(() => {
    document.title = t("web.title");
  }, [t]);

  useEffect(() => {
    let alive = true;

    const heartbeatWatcher = window.setInterval(() => {
      if (alive) {
        alive = false;
      } else {
        setConnected(false);
      }
    }, 2000);

    const heartbeatPoller = window.setInterval(async () => {
      const info = await send("common", "getAppInfo", apiKey);
      if ("response" in info && info.response.version !== undefined) {
        alive = true;
        setConnected(true);
      }
    }, 1000);

    return () => {
      window.clearInterval(heartbeatWatcher);
      window.clearInterval(heartbeatPoller);
    };
  }, [apiKey]);

  function select() {
    fileInputRef.current?.click();
  }

  async function loadFile(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error("error"));
      };
      reader.readAsDataURL(file);
    }).then((dataURL) => ({
      dataURL,
      filename: file.name,
    }));
  }

  async function upload() {
    const files = Array.from(fileInputRef.current?.files || []);
    if (files.length === 0) {
      return;
    }

    setStatus("progress");
    setUploading(true);
    try {
      const results = await ppa(async (file) => {
        const data = await loadFile(file);
        return send("importer", "import", apiKey, [
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
          throw new Error(result.error);
        }
        return result.response.length;
      });

      setStatus(responseLengthList.includes(0) ? "failed" : "successful");
    } catch {
      setStatus("failed");
    }
    setUploading(false);
  }

  return (
    <div className={rootStyle}>
      <div className={titleStyle}>{t("web.title")}</div>
      <input accept="image/*" className={hiddenInputStyle} multiple ref={fileInputRef} type="file" />
      {connected ? (
        <div className={controlsStyle}>
          <div className={statusStyle}>
            {status === "ready" ? "" : t(`web.status.${status}`)}
          </div>
          <div className={buttonRowStyle}>
            <button className={buttonStyle} disabled={uploading} onClick={select} type="button">
              {t("web.selectButton")}
            </button>
            <button className={buttonStyle} disabled={uploading} onClick={upload} type="button">
              {t("web.uploadButton")}
            </button>
          </div>
        </div>
      ) : (
        <div className={statusStyle}>{t("web.noConnections")}</div>
      )}
    </div>
  );
}

async function send<C extends keyof IpcFunctions, U extends keyof IpcFunctions[C]>(
  category: C,
  event: U,
  apiKey: string,
  ...args: Parameters<FunctionGuard<IpcFunctions[C][U]>>
): Promise<
  | {
      response: Awaited<ReturnType<FunctionGuard<IpcFunctions[C][U]>>>;
    }
  | { error: string }
> {
  const response = await fetch(`http://${location.host.split(":")[0]}:${WEBHOOK_PORT}/api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "impt-web-api-key": apiKey,
    },
    body: JSON.stringify({
      event: `${category}.${String(event)}`,
      args,
    }),
  });
  return response.json();
}
