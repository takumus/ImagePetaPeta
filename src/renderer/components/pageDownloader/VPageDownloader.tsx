import { useEffect, useState } from "react";
import { css } from "styled-system/css";

import { PageDownloaderData } from "@/commons/datas/pageDownloaderData";
import { PROTOCOLS } from "@/commons/defines";

import VSelectableBox from "@/renderer/components/commons/utils/selectableBox/VSelectableBox";
import { IPC } from "@/renderer/libs/ipc";

type DownloadImage = Omit<PageDownloaderData, "urls" | "referer"> & {
  id: string;
  cacheURL: string;
  error: boolean;
  selected: boolean;
  size: { height: number; width: number } | null;
  url: string;
};

const rootStyle = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "px2",
  width: "100%",
  height: "100%",
  overflowY: "auto",
});

const imageStyle = css({
  display: "block",
  width: "300px",
  height: "300px",
  flexShrink: 0,
});

const imageContentStyle = css({
  display: "block",
  width: "100%",
  height: "100%",
  border: "none",
  background: "transparent",
  padding: 0,
});

const imageElementStyle = css({
  width: "100%",
  height: "100%",
  objectFit: "contain",
});

const innerStyle = css({
  position: "relative",
  width: "100%",
  height: "100%",
});

const badgeStyle = css({
  position: "absolute",
  top: "px0",
  left: "px0",
  borderRadius: "window",
  backgroundColor: "surfaceEmphasis",
  paddingX: "px1",
  paddingY: "px0",
  fontSize: "size0",
  lineHeight: "size0",
});

const errorStyle = css({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  borderRadius: "window",
  backgroundColor: "surfaceEmphasis",
  paddingX: "px1",
  paddingY: "px0",
  fontSize: "size0",
  lineHeight: "size0",
});

function normalizePageDownloaderDatas(datas: PageDownloaderData[]) {
  const images: DownloadImage[] = [];
  datas.forEach((data) => {
    data.urls.forEach((url) => {
      images.unshift({
        id: `${data.pageURL}::${url}`,
        cacheURL: url.startsWith("data")
          ? url
          : `${PROTOCOLS.FILE.PAGE_DOWNLOADER_CACHE}://?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(data.referer)}`,
        pageTitle: data.pageTitle,
        pageURL: data.pageURL,
        url,
        selected: false,
        error: false,
        size: null,
      });
    });
  });
  return images;
}

export default function VPageDownloader() {
  const [images, setImages] = useState<DownloadImage[]>([]);

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      const datas = await IPC.downloader.getAll();
      if (!mounted) {
        return;
      }
      setImages(normalizePageDownloaderDatas(datas));
    };

    void refresh();
    const subscription = IPC.pageDownloader.on("update", () => {
      void refresh();
    });

    return () => {
      mounted = false;
      subscription.off();
    };
  }, []);

  function loaded(id: string, img: HTMLImageElement) {
    setImages((current) =>
      current.map((image) =>
        image.id === id
          ? {
              ...image,
              size: {
                width: img.naturalWidth,
                height: img.naturalHeight,
              },
            }
          : image,
      ),
    );
  }

  function error(id: string) {
    setImages((current) =>
      current.map((image) => (image.id === id ? { ...image, error: true } : image)),
    );
  }

  function click(image: DownloadImage) {
    void IPC.importer.import([
      [
        {
          type: "url",
          additionalData: {
            name: image.pageTitle,
            note: image.pageURL,
          },
          url: image.cacheURL,
        },
      ],
    ]);
  }

  return (
    <div className={rootStyle}>
      {images.map((image) => (
        <div className={imageStyle} key={image.id}>
          <VSelectableBox
            inner={
              <div className={innerStyle}>
                {image.size ? (
                  <div className={badgeStyle}>
                    {image.size.width} x {image.size.height}
                  </div>
                ) : null}
                {image.error ? <div className={errorStyle}>error</div> : null}
              </div>
            }
            selected={image.selected}
            zoom>
            {!image.error ? (
              <button className={imageContentStyle} onClick={() => click(image)} type="button">
                <img
                  className={imageElementStyle}
                  decoding="async"
                  loading="lazy"
                  onError={() => error(image.id)}
                  onLoad={(event) => loaded(image.id, event.currentTarget)}
                  src={image.cacheURL}
                />
              </button>
            ) : null}
          </VSelectableBox>
        </div>
      ))}
    </div>
  );
}
