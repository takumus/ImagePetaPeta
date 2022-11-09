import express from "express";
import bodyParser from "body-parser";
import { IpFilter } from "express-ipfilter";
import cors from "cors";
import { MainFunctions } from "@/commons/api/mainFunctions";
import { IpcMainInvokeEvent } from "electron";
import { MainLogger } from "@/mainProcess/utils/mainLogger";
import { WEBHOOK_PORT, WEBHOOK_WHITELIST_IP_LIST } from "@/commons/defines";
export function initWebhook(
  mainFunctions: {
    [P in keyof MainFunctions]: (
      event: IpcMainInvokeEvent,
      ...args: Parameters<MainFunctions[P]>
    ) => ReturnType<MainFunctions[P]>;
  },
  mainLogger: MainLogger,
) {
  const initLog = mainLogger.logChunk();
  try {
    initLog.log(`$Webhook: init`);
    const http = express();
    http.use(bodyParser.urlencoded({ extended: false, limit: "100mb" }));
    http.use(bodyParser.json({ limit: "100mb" }));
    http.use(cors());
    http.use(IpFilter(WEBHOOK_WHITELIST_IP_LIST, { mode: "allow" }));
    const server = http.listen(WEBHOOK_PORT, () => {
      initLog.log(`$Webhook: opened`, WEBHOOK_PORT);
    });
    http.post("/", async (req, res) => {
      const executeLog = mainLogger.logChunk();
      try {
        executeLog.log(`$Webhook: receive`, req.body);
        const eventName = req.body.event as string;
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const event = (mainFunctions as any)[eventName];
        if (event) {
          executeLog.log(`$Webhook: execute`, eventName);
          res.json(await event(undefined, ...(req.body.args ?? [])));
          executeLog.log(`$Webhook: done`, eventName);
          return;
        }
        executeLog.log(`$Webhook: invalid event`, eventName);
      } catch (error) {
        executeLog.error(`$Webhook: event error`, error);
      }
    });
    return {
      close: () => {
        return new Promise<Error | undefined>((res) => {
          server.close(res);
        });
      },
    };
  } catch (error) {
    initLog.error(`$Webhook: error`, error);
  }
}
