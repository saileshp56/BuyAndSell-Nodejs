const { app, BrowserWindow } = require("electron");
const express = require(__dirname + "/node_modules/express");
const bodyParser = require(__dirname + "/node_modules/body-parser");
var cors = require(__dirname + "/node_modules/cors");
const puppeteer = require(__dirname + "/node_modules/puppeteer");

const path = require("path");
const isDev = require("electron-is-dev");

const server = express();

server.use(bodyParser.urlencoded({ extended: false }));
server.use(cors()); // Use this after the variable declaration
server.use(express.json());

server.post("/scrapy", async (req, res, next) => {
  console.log("Received post request at backend's /scrapy: ", req.body);
  const wordlist = ["buyandsell"];
  let allowedDomains = new Set(req.body.allowedDomains);

  const ds = [];
  let startUrls = req.body.startUrls;
  let time = req.body.time;
  let deny = new Set();
  if (req.body.deny[0] == "") {
  } else {
    for (ele in req.body.deny) {
      deny.add(ele);
    }
  }
  if (allowedDomains.has("")) {
    allowedDomains = new Set();
    allowedDomains.add("buyandsell.gc.ca");
  }
  if (startUrls[0] == "") {
    startUrls = ["https://buyandsell.gc.ca/for-businesses"];
  }
  if (!time) {
    time = 2;
  }

  console.log(
    "allowed:",
    allowedDomains,
    "start:",
    startUrls,
    "deny:",
    deny,
    "time:",
    time
  );

  const browser = await puppeteer.launch({ headless: "true" });
  const page = await browser.newPage();

  // Set screen size
  await page.setViewport({ width: 1080, height: 1024 });

  // seen ds
  const visited = new Set();

  // queue ds
  const queue = [...startUrls];

  // start timer
  const startTime = Date.now();

  while (queue.length > 0 && (Date.now() - startTime) / 1000 < time) {
    // dequeue a URL
    const url = queue.shift();

    // skip if seen
    if (visited.has(url)) {
      continue;
    }

    // add it to seen
    visited.add(url);

    try {
      await page.goto(url);

      const bodyText = await page.$eval("body", (body) => body.innerText);
      for (let word of wordlist) {
        if (bodyText.includes(word)) {
          ds.push(url);
          break;
        }
      }

      // Get all links on the page
      const links = await page.$$eval("a", (as) => as.map((a) => a.href));
      for (let link of links) {
        try {
          let domain = new URL(link).hostname;
          domain = domain.replace(/^www\./, "");

          let isDenied = false;
          for (let term of deny) {
            if (link.includes(term)) {
              isDenied = true;
              break;
            }
          }

          if (allowedDomains.has(domain) && !isDenied) {
            console.log(link, " is ok for", domain);
            queue.push(link);
          } else {
            console.log(link, " is not ok for", domain);
          }
        } catch {
          continue;
        }
      }
    } catch {}
  }

  await browser.close();
  console.log(ds);
  res.json(ds);
});

server.listen(5000, () => console.log("Express server listening on port 5000"));

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({ width: 900, height: 680 });
  mainWindow.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../frontend/build/index.html")}`
  );
  mainWindow.on("closed", () => (mainWindow = null));
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
