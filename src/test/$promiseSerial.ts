import { promiseSerial } from "@/commons/utils/promiseSerial";

const result = promiseSerial(
  async (d) => {
    await wait(1000);
    console.log(d);
    return d * d;
  },
  [1, 2, 3, 4, 5],
);

result.promise
  .then((value) => {
    console.log("completed:", value);
  })
  .catch((reason) => {
    //
  });

setTimeout(() => {
  result.cancel().then((value) => {
    console.log("canceled:", value);
  });
}, 3000);

function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
