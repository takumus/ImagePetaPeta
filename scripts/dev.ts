import { cancelableRun } from "scripts/cancelableRun";

cancelableRun(["npm", "run", "dev:app"], ["npm", "run", "dev:app-web"]);
