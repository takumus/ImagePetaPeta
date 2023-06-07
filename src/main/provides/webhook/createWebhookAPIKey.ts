import { v4 as uuid } from "uuid";

export function createWebhookAPIKey() {
  return Array.from(Array(8))
    .map(() => uuid())
    .join("-");
}
