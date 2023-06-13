import logo from "./logo.svg";
import "./App.css";
import { useState, useRef } from "react";
import axios from "axios";

function App() {
  const allowedDomainsRef = useRef();
  const startUrlsRef = useRef();
  const timeRef = useRef();
  const denyRef = useRef();
  const [loading, setLoading] = useState(false);

  const submissionHandler = async (e) => {
    e.preventDefault();

    const allowedDomains = allowedDomainsRef.current.value.split(",");
    const startUrls = startUrlsRef.current.value.split(",");
    const deny = denyRef.current.value.split(",").map(function (item) {
      return item.trim();
    });
    let time;
    try {
      time = parseInt(timeRef.current.value);
    } catch (err) {
      time = 2;
    }
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
    }, time * 1000 + 2000);

    let scrapeRequest = {
      allowedDomains,
      startUrls,
      time,
      deny,
    };

    axios
      .post(
        // "https://hgblwxjn32.execute-api.us-east-1.amazonaws.com/prod/scrapy",
        "http://localhost:5000/scrapy",
        scrapeRequest
      )
      .then((response) => {
        const fileData = response.data;
        console.log(fileData);
        const blob = new Blob([fileData.join("\n")], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = "scrapy_output.txt";
        link.href = url;
        link.click();
      })
      .catch((err) => {
        console.error("Error ", err);
        alert(
          `Something went wrong. Email the developer Sailesh Polavarapu with the following Error Code: ${err.response.status}\nand the following Error Message\n: ${err.response.data.message}`
        );
        console.log(err.response.data.message);
      });
  };
  return (
    <div>
      <form>
        <label>Allowed Domains</label>
        <input
          type="text"
          placeholder="Leave empty for buyandsell.gc.ca"
          ref={allowedDomainsRef}
        />

        <label>Start URLs</label>
        <input
          type="text"
          placeholder="Leave empty for https://buyandsell.gc.ca/for-businesses"
          ref={startUrlsRef}
        />

        <label>Time Spent Querying</label>
        <input
          type="number"
          placeholder="Leave empty for 2 seconds"
          ref={timeRef}
        />
        <label>
          URLs to Ignore | Try "search/, tender-notice/, award-notice/,
          contract-history/, goods-and-services-identification-number/,
          standing-offers-and-supply-arrangements/,
          request-your-own-supplier-contract-history-letter, feed?"
        </label>
        <input
          type="text"
          placeholder="Leave empty for no ignored URLs"
          ref={denyRef}
        />

        <input type="submit" value="Submit" onClick={submissionHandler} />
        {loading && (
          <h2>
            Your query is being processed. If the text file does not have the
            expected info, please submit again as our web scraper is blocked by
            websites sometimes.
          </h2>
        )}
      </form>
    </div>
  );
}

export default App;
