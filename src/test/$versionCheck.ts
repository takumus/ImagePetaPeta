import { isLatest } from "@/commons/utils/versions";

for (let i = 0; i < 100; i++) {
  const v1 =
    Math.floor(Math.random() * 3) +
    "." +
    Math.floor(Math.random() * 3) +
    "." +
    Math.floor(Math.random() * 5) +
    "-beta";
  const v2 =
    Math.floor(Math.random() * 3) +
    "." +
    Math.floor(Math.random() * 3) +
    "." +
    Math.floor(Math.random() * 10) +
    "-beta";
  console.log(v1, v2, isLatest(v1, v2));
}
