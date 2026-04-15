import { useEffect, useState } from "react";
import { css } from "styled-system/css";

import { PetaFile } from "@/commons/datas/petaFile";

import { IPC } from "@/renderer/libs/ipc";
import { getFileURL } from "@/renderer/utils/fileURL";

import NsfwTexture from "@/_public/images/textures/nsfw.png";
import TransparentTexture from "@/_public/images/textures/transparent.png";

const rootStyle = css({
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  backgroundPosition: "center",
  backgroundRepeat: "repeat",
  backgroundSize: "16px 16px",
});

const centeredStyle = css({
  display: "grid",
  width: "100%",
  height: "100%",
  placeItems: "center",
});

const imageStyle = css({
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
});

const videoStyle = css({
  width: "100%",
  height: "100%",
  objectFit: "contain",
});

const nsfwStyle = css({
  width: "100%",
  height: "100%",
  backgroundPosition: "center",
  backgroundRepeat: "repeat",
  backgroundSize: "32px 32px",
});

export default function VDetails({
  petaFile,
}: {
  petaFile?: PetaFile;
}) {
  const [showNSFW, setShowNSFW] = useState(false);

  useEffect(() => {
    let mounted = true;
    void IPC.nsfw.get().then((value) => {
      if (mounted) {
        setShowNSFW(value);
      }
    });
    const subscription = IPC.common.on("showNSFW", (_event, value) => {
      setShowNSFW(value);
    });
    return () => {
      mounted = false;
      subscription.off();
    };
  }, []);

  if (petaFile === undefined) {
    return <div className={rootStyle} style={{ backgroundImage: `url(${TransparentTexture})` }} />;
  }

  const masked = petaFile.nsfw && !showNSFW;
  const originalURL = getFileURL(petaFile, "original");

  return (
    <div className={rootStyle} style={{ backgroundImage: `url(${TransparentTexture})` }}>
      {masked ? (
        <div className={nsfwStyle} style={{ backgroundImage: `url(${NsfwTexture})` }} />
      ) : petaFile.metadata.type === "video" ? (
        <div className={centeredStyle}>
          <video
            autoPlay
            className={videoStyle}
            controls
            loop
            muted={false}
            playsInline
            src={originalURL}
          />
        </div>
      ) : (
        <div className={centeredStyle}>
          <img alt={petaFile.name} className={imageStyle} draggable={false} src={originalURL} />
        </div>
      )}
    </div>
  );
}
