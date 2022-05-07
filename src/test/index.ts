const file = "./" + (process as any)["argv"][2] as string;
console.log("test:", file);
require(file);