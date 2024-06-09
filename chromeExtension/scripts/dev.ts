import { cancelableRun } from "../../scripts/cancelableRun";

cancelableRun(
  ["npm", "run", "dev:background"],
  ["npm", "run", "dev:get-all-url"],
  ["npm", "run", "dev:popup"],
  ["npm", "run", "dev:ui"],
  ["npm", "run", "dev:manifest"],
);
