const express = require("express");
const bodyParser = require("body-parser");
var cors = require("cors");
const puppeteer = require("puppeteer");
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors()); // Use this after the variable declaration
app.use(express.json());

app.post("/scrapy", async (req, res, next) => {
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
    time = 9;
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

app.listen(5000, () => console.log("server listening on port 5000"));

// module.exports.handler = serverless(app);
