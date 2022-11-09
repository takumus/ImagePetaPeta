import express from "express";
import bodyParser from "body-parser";
import { IpFilter } from "express-ipfilter";
import cors from "cors";
import { MainFunctions } from "@/commons/api/mainFunctions";
import { IpcMainInvokeEvent } from "electron";
import { MainLogger } from "@/mainProcess/utils/mainLogger";
export function initWebhook(
  port: number,
  mainFunctions: {
    [P in keyof MainFunctions]: (
      event: IpcMainInvokeEvent,
      ...args: Parameters<MainFunctions[P]>
    ) => ReturnType<MainFunctions[P]>;
  },
  mainLogger: MainLogger,
) {
  const initLog = mainLogger.logChunk().log;
  initLog(`$Webhook: init`);
  const http = express();
  http.use(bodyParser.urlencoded({ extended: false, limit: "100mb" }));
  http.use(bodyParser.json({ limit: "100mb" }));
  http.use(cors());
  // http.use(IpFilter(["127.0.0.1"], { mode: "allow" }));
  const server = http.listen(port, () => {
    initLog(`$Webhook: opened (${port})`);
  });
  http.post("/", async (req, res) => {
    const executeLog = mainLogger.logChunk().log;
    executeLog(`$Webhook: receive(${req.body})`);
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const eventName = req.body.event as string;
    const event = (mainFunctions as any)[eventName];
    if (event) {
      executeLog(`$Webhook: execute (${eventName})`);
      res.json(await event(undefined, ...(req.body.args ?? [])));
      executeLog(`$Webhook: done (${eventName})`);
      return;
    }
    executeLog(`$Webhook: invalid event (${eventName})`);
  });
  return {
    close: () => {
      return new Promise<Error | undefined>((res) => {
        server.close(res);
      });
    },
  };
}
