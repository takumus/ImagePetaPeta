import cors from "cors";
import express, { Express } from "express";
import { IncomingMessage, Server, ServerResponse } from "http";
import { resolve } from "path";

import { WEBHOOK_PORT } from "@/commons/defines";
import { IpcFunctions } from "@/commons/ipc/ipcFunctions";
import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";
import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";

import { createKey, createUseFunction } from "@/main/libs/di";
import { useLogger } from "@/main/provides/utils/logger";
import { createWebhookAPIKey } from "@/main/provides/webhook/createWebhookAPIKey";

type EventNames = keyof IpcFunctions;
const allowedEvents: EventNames[] = ["importFiles", "getAppInfo"];
export class WebHook extends TypedEventEmitter<{
  open: () => void;
  error: () => void;
  closed: () => void;
}> {
  private http: Express;
  private server?: Server<typeof IncomingMessage, typeof ServerResponse>;
  private webAPIKey = createWebhookAPIKey();
  constructor(private ipcFunctions: IpcFunctionsType) {
    super();
    const logger = useLogger();
    const log = logger.logMainChunk();
    this.http = express();
    this.http.use(cors());
    this.http.use("/api", (req, res, next) => {
      if (req.headers.origin?.startsWith("chrome-extension://")) {
        next();
        return;
      }
      if (req.headers["impt-web-api-key"] === this.webAPIKey) {
        next();
        return;
      }
      res.status(400);
      res.json({ error: "you are not image-petapeta" });
    });
    this.http.use(express.json({ limit: "100mb" }));
    this.http.use(
      "/web",
      express.static(
        process.env.NODE_ENV === "development"
          ? resolve("./_electronTemp/dist/web")
          : resolve(__dirname, "../web"),
      ),
    );
    this.initAPI();
  }
  private initAPI() {
    const logger = useLogger();
    this.http.post("/api", async (req, res) => {
      const executeLog = logger.logMainChunk();
      try {
        const eventName = req.body.event as EventNames;
        if (!allowedEvents.includes(eventName)) {
          res.status(400).json({ error: `not allowed event: ${eventName}` });
          executeLog.debug(`$Webhook(api): not allowed event`, eventName);
          return;
        }
        const event = this.ipcFunctions[eventName] as
          | ((...args: any[]) => Promise<any>)
          | undefined;
        if (event !== undefined) {
          executeLog.debug(`$Webhook(api): execute`, eventName);
          res.json(await event(undefined, ...(req.body.args ?? [])));
          executeLog.debug(`$Webhook(api): done`, eventName);
          return;
        }
        res.status(400).json({ error: `invalid event: ${eventName}` });
        executeLog.debug(`$Webhook(api): invalid event`, eventName);
      } catch (error) {
        res.status(500).json({ error: `event error: ${JSON.stringify(error)}` });
        executeLog.error(`$Webhook(api): event error`, error);
      }
    });
  }
  public async open(port: number) {
    const logger = useLogger();
    const log = logger.logMainChunk();
    log.debug(`$Webhook(open): begin`, port);
    if (this.server !== undefined) {
      log.debug(`$Webhook(open): already opened`);
      await this.close();
    }
    return await new Promise<number>((res, rej) => {
      this.server = this.http.listen(port, () => {
        log.debug(`$Webhook(open): done`);
        this.emit("open");
        res(port);
      });
      this.server.on("error", (error) => {
        log.debug(`$Webhook(open): error`, WEBHOOK_PORT, error);
        this.close().then(() => {
          rej(error);
        });
      });
    });
  }
  public async close() {
    const logger = useLogger();
    const log = logger.logMainChunk();
    const server = this.server;
    log.debug(`$Webhook(close): begin`);
    if (server === undefined) {
      log.debug(`$Webhook(close): no server`);
      return;
    }
    return new Promise<void>((res) => {
      server.close((error) => {
        this.server = undefined;
        if (error === undefined) {
          log.debug(`$Webhook(close): done`);
          this.emit("closed");
        } else {
          log.debug(`$Webhook(close): done (already closed)`);
        }
        res();
      });
    });
  }
  public getAPIKEY() {
    return this.webAPIKey;
  }
}
export const webhookKey = createKey<WebHook>("webhook");
export const useWebHook = createUseFunction(webhookKey);
