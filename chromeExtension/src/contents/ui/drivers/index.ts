import { pinterest } from "$/contents/ui/drivers/pinterest";
import { twitter } from "$/contents/ui/drivers/twitter";

// export const urlDrivers = [pinterest, twitter];
export function transFormURLs(urls: string[]) {
  return [pinterest, twitter].reduce<string[]>((urls, driver) => driver(urls), urls);
}
