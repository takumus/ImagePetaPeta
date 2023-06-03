import { networkInterfaces } from "os";

export function getIPs() {
  const netInterfaces = networkInterfaces();
  const ips: { [key: string]: string[] } = {};
  Object.keys(netInterfaces).forEach((name) => {
    netInterfaces[name]
      ?.filter((info) => info.family === "IPv4" && !info.internal)
      .forEach((info) => {
        if (ips[name] === undefined) {
          ips[name] = [];
        }
        ips[name].push(info.address);
      });
  });
  return ips;
}
