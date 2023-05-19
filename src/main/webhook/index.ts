import cors from "cors";
import express from "express";
import { IpFilter } from "express-ipfilter";
import { Server } from "http";

import {
  WEBHOOK_PORT,
  WEBHOOK_WHITELIST_IP_LIST,
  WEBHOOK_WHITELIST_ORIGIN_LIST,
} from "@/commons/defines";
import { IpcFunctions } from "@/commons/ipc/ipcFunctions";
import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";

import { useLogger } from "@/main/provides/utils/logger";

type EventNames = keyof IpcFunctions;
const allowedEvents: EventNames[] = [
  "importFiles",
  "getPetaFiles",
  "updatePetaFiles",
  "updatePetaTags",
  "updatePetaFilesPetaTags",
  "updatePetaBoards",
  "getAppInfo",
];
export async function initWebhook(ipcFunctions: IpcFunctionsType, allowAllOrigin = false) {
  const logger = useLogger();
  const initLog = logger.logMainChunk();
  try {
    initLog.log(`$Webhook: init`);
    const http = express();
    http.use(express.json({ limit: "100mb" }));
    http.use(cors());
    http.use(IpFilter(WEBHOOK_WHITELIST_IP_LIST, { mode: "allow" }));
    http.post("/", async (req, res) => {
      if (
        WEBHOOK_WHITELIST_ORIGIN_LIST.find((origin) => req.headers.origin?.startsWith(origin)) ===
          undefined &&
        !allowAllOrigin
      ) {
        res.status(403).json({ error: `invalid origin: ${req.headers.origin}` });
        return;
      }
      const executeLog = logger.logMainChunk();
      try {
        executeLog.log(`$Webhook: receive`, req.headers.origin, req.body);
        const eventName = req.body.event as EventNames;
        if (!allowedEvents.includes(eventName)) {
          res.status(400).json({ error: `invalid event: ${eventName}` });
          executeLog.log(`$Webhook: invalid event`, eventName);
          return;
        }
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const event = ipcFunctions[eventName] as any;
        if (event) {
          executeLog.log(`$Webhook: execute`, eventName);
          res.json(await event(undefined, ...(req.body.args ?? [])));
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
    const server = await new Promise<Server>((res) => {
      const s = http.listen(WEBHOOK_PORT, () => {
        initLog.log(`$Webhook: opened`, WEBHOOK_PORT);
        res(s);
      });
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
