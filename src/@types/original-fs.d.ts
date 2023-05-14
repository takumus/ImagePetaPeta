// fsをインポートしようとすると、これが優先で出てくるのが嫌だから！
declare module "original-fs" {
  export = {};
}
