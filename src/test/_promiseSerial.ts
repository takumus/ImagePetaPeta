import { promiseSerial } from "@/commons/utils/promiseSerial";

promiseSerial(async (d) => {
  await wait(100);
  console.log(d);
  return d * d;
}, [1, 2, 3, 4, 5])
.value
.then((value) => {
  console.log(value);
});

function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}