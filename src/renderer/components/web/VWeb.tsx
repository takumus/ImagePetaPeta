import * as QR from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { css } from "styled-system/css";

import { Style, defaultStyles } from "@/renderer/styles/styles";
import { IPC } from "@/renderer/libs/ipc";

const accessesStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "px3",
  width: "100%",
  height: "100%",
  overflowY: "auto",
});

const accessStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "px2",
  backgroundColor: "surface",
});

const imageStyle = css({
  width: "200px",
  pointerEvents: "none",
});

const nameStyle = css({
  display: "block",
});

const urlStyle = css({
  display: "block",
  cursor: "pointer",
  textDecoration: "underline",
});

type WebURLData = {
  image: string;
  name: string;
  url: string;
};

export default function VWeb() {
  const [style, setStyle] = useState<Style>(defaultStyles.dark);
  const [webURLs, setWebURLs] = useState<Record<string, string[]>>({});
  const [webURLData, setWebURLData] = useState<WebURLData[]>([]);

  useEffect(() => {
    let mounted = true;

    void Promise.all([IPC.common.getStyle(), IPC.common.getWebURL()]).then(([nextStyle, nextWebURLs]) => {
      if (!mounted) {
        return;
      }
      setStyle(nextStyle);
      setWebURLs(nextWebURLs);
    });

    const styleSubscription = IPC.common.on("style", (_event, nextStyle) => {
      setStyle(nextStyle);
    });

    return () => {
      mounted = false;
      styleSubscription.off();
    };
  }, []);

  const webEntries = useMemo(() => Object.entries(webURLs), [webURLs]);

  useEffect(() => {
    let canceled = false;

    const generate = async () => {
      const nextData = (
        await Promise.all(
          webEntries.flatMap(([name, urls]) =>
            urls.map(async (url) => {
              const image = await QR.toDataURL(url, {
                color: {
                  light: style["--color-0"],
                  dark: style["--color-font"],
                },
                scale: 20,
              });
              return {
                url,
                name,
                image,
              };
            }),
          ),
        )
      ).filter(Boolean);

      if (!canceled) {
        setWebURLData(nextData);
      }
    };

    void generate();

    return () => {
      canceled = true;
    };
  }, [style, webEntries]);

  return (
    <div className={accessesStyle}>
      {webURLData.map((urlAndQR) => (
        <div className={accessStyle} key={`${urlAndQR.name}-${urlAndQR.url}`}>
          <img alt={urlAndQR.name} className={imageStyle} src={urlAndQR.image} />
          <div className={nameStyle}>{urlAndQR.name}</div>
          <button
            className={urlStyle}
            onClick={() => void IPC.common.openURL(urlAndQR.url)}
            type="button">
            {urlAndQR.url.replace(/\?.*/g, "***")}
          </button>
        </div>
      ))}
    </div>
  );
}
