const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");

const morgan = require("./mb-server");
const mirah = require("./mq-server");
const smith = require("./sm-server");

const sites = {
  morgan: { app: morgan.app, init: morgan.init, index: "mb-index.html" },
  mirah: { app: mirah.app, init: mirah.init, index: "mq-index.html" },
  smith: { app: smith.app, init: smith.init, index: "sm-index.html" },
};

const PREFIX = {
  morgan: "/morgan",
  mirah: "/mirah",
  smith: "/smith",
};

const COOKIE = "sitebox";
const PORT = Number(process.env.PORT || 8090);
const app = express();
app.disable("x-powered-by");
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true, box: "morgan-mirah-smith" }));

Object.entries(PREFIX).forEach(([key, prefix]) => {
  app.use(prefix, (req, res, next) => {
    res.cookie(COOKIE, key, { path: "/", sameSite: "lax", maxAge: 365 * 24 * 3600 * 1000 });
    next();
  });
  const sendIndex = (_req, res) => {
    res.sendFile(path.join(__dirname, sites[key].index));
  };
  app.get(prefix, sendIndex);
  app.get(prefix + "/", sendIndex);
  app.use(prefix, sites[key].app);
});

app.use((req, res, next) => {
  const key = req.cookies[COOKIE];
  if (!key || !sites[key]) return next();
  const p = req.path;
  if (
    p.startsWith("/api") ||
    p.startsWith("/media") ||
    p.startsWith("/admin") ||
    p.startsWith("/uploads")
  ) {
    return sites[key].app(req, res, next);
  }
  next();
});

app.get("/favicon.ico", (req, res) => {
  const key = req.cookies[COOKIE];
  const file =
    key === "smith" ? "sm-smith-mark.jpg" :
    key === "mirah" ? "mq-favicon.png" :
    key === "morgan" ? "mb-favicon.png" :
    null;
  if (!file) return res.status(204).end();
  res.sendFile(path.join(__dirname, file));
});
app.use(express.static(__dirname));
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "index.html")));

process.on("unhandledRejection", (e) => console.error("unhandled:", e && e.message));
process.on("uncaughtException", (e) => console.error("uncaught:", e && e.message));

app.listen(PORT, "0.0.0.0", () => {
  console.log("Box live on 0.0.0.0:" + PORT);
  morgan
    .init()
    .then(() => mirah.init())
    .then(() => smith.init())
    .then(() => console.log("DB ready"))
    .catch((err) => console.error("DB init:", err.message));
});
