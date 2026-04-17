import { FormEvent, useEffect, useState } from "react";
import { css } from "styled-system/css";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar";
import VCheckbox from "@/renderer/components/commons/utils/checkbox/VCheckbox";
import { appButtonStyle, textInputStyle } from "@/renderer/components/shared/controlStyles";
import { IPC } from "@/renderer/libs/ipc";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const rootStyle = css({
  position: "fixed",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  backgroundColor: "surface",
  color: "text",
});

const contentStyle = css({
  display: "flex",
  flex: 1,
  flexDirection: "column",
  gap: "px2",
  padding: "px2",
});

const rowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "px2",
});

export default function VWindowPassword() {
  const { windowTitle } = useWindowTitleStore();
  const [password, setPassword] = useState("");
  const [save, setSave] = useState(false);

  useEffect(() => {
    windowTitle.value = "";
  }, [windowTitle]);

  function login(event: FormEvent) {
    event.preventDefault();
    void IPC.common.login(password, save);
  }

  return (
    <form className={rootStyle} onSubmit={login}>
      <div>
        <VTitleBar title="" />
      </div>
      <div className={contentStyle}>
        <input
          autoFocus
          className={textInputStyle}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
        <div>
          <button className={appButtonStyle} type="submit">
            login
          </button>
        </div>
        <div className={rowStyle}>
          <VCheckbox onValueChange={setSave} value={save} />
        </div>
      </div>
    </form>
  );
}
