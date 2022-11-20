import express from "express";
import bodyParser from "body-parser";
import { IpFilter } from "express-ipfilter";
import cors from "cors";
import { ToMainFunctions } from "@/commons/ipc/toMainFunctions";
import { IpcMainInvokeEvent } from "electron";
import { MainLogger } from "@/main/utils/mainLogger";
import {
  WEBHOOK_PORT,
  WEBHOOK_WHITELIST_IP_LIST,
  WEBHOOK_WHITELIST_ORIGIN_LIST,
} from "@/commons/defines";
type EventNames = keyof ToMainFunctions;
const allowedEvents: EventNames[] = ["importImages"];
export function initWebhook(
  toMainFunctions: {
    [P in keyof ToMainFunctions]: (
      event: IpcMainInvokeEvent,
      logger: MainLogger,
      ...args: Parameters<ToMainFunctions[P]>
    ) => ReturnType<ToMainFunctions[P]>;
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
      if (
        WEBHOOK_WHITELIST_ORIGIN_LIST.find((origin) => req.headers.origin?.startsWith(origin)) ===
        undefined
      ) {
        res.status(403).json({ error: `invalid origin: ${req.headers.origin}` });
        return;
      }
      const executeLog = mainLogger.logChunk();
      try {
        executeLog.log(`$Webhook: receive`, req.headers.origin, req.body);
        const eventName = req.body.event as EventNames;
        if (!allowedEvents.includes(eventName)) {
          res.status(400).json({ error: `invalid event: ${eventName}` });
          executeLog.log(`$Webhook: invalid event`, eventName);
          return;
        }
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const event = toMainFunctions[eventName] as any;
        if (event) {
          executeLog.log(`$Webhook: execute`, eventName);
          res.json(await event(undefined, mainLogger, ...(req.body.args ?? [])));
          executeLog.log(`$Webhook: done`, eventName);
          return;
        }
        res.status(400).json({ error: `invalid event: ${eventName}` });
        executeLog.log(`$Webhook: invalid event`, eventName);
      } catch (error) {
        res.status(500).json({ error: `event error: ${JSON.stringify(error)}` });
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
