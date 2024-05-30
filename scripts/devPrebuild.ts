import electron from "electron";
import { cancelableRun } from "scripts/cancelableRun";

const electronPath = electron as any as string;
cancelableRun([electronPath, ".", "--sourcemap", "--inspect=9229"]);
