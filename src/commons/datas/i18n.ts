export type I18NProp = string | ((ctx: { list: (index: number) => string }) => string);
export type I18N = {
  [key: string]: I18NProp | I18N;
};
