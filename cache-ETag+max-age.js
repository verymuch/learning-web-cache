const path = require("path");
const fs = require("fs");
const md5 = require("md5")
const Koa = require("koa");
const PassThrough = require("stream").PassThrough;

const log = console.log;
const app = new Koa();

// 获取访问文件路径
app.use(async (ctx, next) => {
  log("\n\n\n\n\n\n", "------------请求处理开始------------");

  let reqPath = ctx.path;

  log("request path", reqPath);

  if (reqPath === "/") reqPath = "/index.html";

  ctx.filePath = "resource" + reqPath;

  next();
});

// 如果文件不存在则报错
app.use(async (ctx, next) => {
  const filePath = ctx.filePath;
  if (!fs.existsSync(filePath)) {
    ctx.status = 404;
    ctx.set({ "Content-Type": "text/html" });
    ctx.body = "<h1>404 Not Found</h1>";
    return;
  }

  next();
});

// 设置 MIME type
app.use(async (ctx, next) => {
  const EXT_MIME_TYPES = {
    default: "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "text/json",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpg",
    ".png": "image/png"
  };

  const filePath = ctx.filePath;
  const mimeType =
    EXT_MIME_TYPES[path.extname(filePath)] || EXT_MIME_TYPES["default"];

  log("mime_type", mimeType);

  ctx.set("Content-Type", mimeType);

  next();
});

// 计算文件的md5
app.use(async (ctx, next) => {
  const filePath = ctx.filePath;

  //从文件创建一个可读流
  const stream = fs.readFileSync(filePath);
  const filemd5 = md5(stream);
  ctx.filemd5 = filemd5;
  log("file md5：%s", filemd5);
  next();
});

// 设置缓存
app.use(async (ctx, next) => {
  // 在此处设置缓存策略
  ctx.set('Cache-Control', 'max-age=86400000');

  const tag = `"${ctx.filemd5}"`;
  const matchTag = ctx.get("If-None-Match");
  if (matchTag === tag) {
    ctx.status = 304;
    log('ETag生效')
    return;
  }
  ctx.set("ETag", tag);

  next();
});

// 返回文件内容
app.use(async (ctx, next) => {
  const filePath = ctx.filePath;

  const resStream = fs.createReadStream(filePath);
  ctx.status = 200;
  ctx.body = resStream.pipe(PassThrough());
  log("------------请求处理完毕------------");
});

// 错误处理
app.on("error", err => {
  console.log("server error", err);
});

app.listen(1030);
