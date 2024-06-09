type FunctionGuard<T> = T extends (...args: any[]) => any ? T : never;
