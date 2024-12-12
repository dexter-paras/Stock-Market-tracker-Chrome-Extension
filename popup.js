const stockList = document.getElementById("stocks");
const stockInput = document.getElementById("stockInput");
const addStock = document.getElementById("addStock");

const apiKey = "API Key"; // Replace with your actual Finnhub API key

// Fetch stock data from Finnhub and render the table
function fetchStock(stock) {
  const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${stock}&token=${apiKey}`;
  const metricsUrl = `https://finnhub.io/api/v1/stock/metric?symbol=${stock}&metric=all&token=${apiKey}`;

  Promise.all([fetch(quoteUrl), fetch(metricsUrl)])
    .then(([quoteRes, metricsRes]) => {
      if (!quoteRes.ok || !metricsRes.ok) {
        throw new Error(`Failed to fetch data for ${stock}`);
      }
      return Promise.all([quoteRes.json(), metricsRes.json()]);
    })
    .then(([quoteData, metricsData]) => {
      if (!quoteData || !metricsData) {
        console.error(`Invalid data received for ${stock}:`, { quoteData, metricsData });
        return;
      }
      renderStock(stock, quoteData, metricsData);
    })
    .catch((error) => console.error("Error fetching stock data:", error));
}

function renderStock(stock, quoteData, metricsData) {
  const tableRow = document.createElement("tr");

  // Validate quoteData
  if (!quoteData || quoteData.c === undefined || quoteData.pc === undefined) {
    console.error(`Invalid quote data for ${stock}:`, quoteData);
    return;
  }

  // Validate metricsData
  const metrics = metricsData.metric || {};
  if (!metrics) {
    console.error(`Invalid metrics data for ${stock}:`, metricsData);
    return;
  }

  const currentPrice = quoteData.c.toFixed(2);
  const previousClose = quoteData.pc.toFixed(2);
  const absChange = (quoteData.c - quoteData.pc).toFixed(2);
  const percentChange = ((quoteData.c - quoteData.pc) / quoteData.pc * 100).toFixed(2);
  const last50DayDiff = metrics["52WeekHigh"]
    ? (currentPrice - metrics["52WeekHigh"]).toFixed(2)
    : "N/A";
  const last200DayDiff = metrics["52WeekLow"]
    ? (currentPrice - metrics["52WeekLow"]).toFixed(2)
    : "N/A";
  const peRatio = metrics.peNormalizedAnnual?.toFixed(2) || "N/A";

  const priceColor = quoteData.c >= quoteData.pc ? "green" : "red";

  tableRow.innerHTML = `
    <td>${stock}</td>
    <td style="color: ${priceColor}">$${currentPrice}</td>
    <td style="color: ${priceColor}">${absChange}</td>
    <td style="color: ${priceColor}">${percentChange}%</td>
    <td class="stock-metrics">
      50D Diff: ${last50DayDiff}<br>
      200D Diff: ${last200DayDiff}<br>
      PE: ${peRatio}
    </td>
    <td>
      <button class="remove-stock" data-stock="${stock}">Remove</button>
    </td>
  `;

  // Add event listener for Remove button
  tableRow.querySelector(".remove-stock").addEventListener("click", () => {
    removeStock(stock, tableRow);
  });

  document.getElementById("stocks").appendChild(tableRow);
}

// Remove stock from the watchlist
function removeStock(stock, listItem) {
  chrome.storage.local.get(["watchlist"], (result) => {
    const updatedList = result.watchlist.filter((s) => s !== stock);
    chrome.storage.local.set({ watchlist: updatedList }, () => {
      stockList.removeChild(listItem);
    });
  });
}

// Add new stock to the watchlist
addStock.addEventListener("click", () => {
  const stock = stockInput.value.toUpperCase();
  if (stock) {
    fetchStock(stock);
    chrome.storage.local.get(["watchlist"], (result) => {
      const updatedList = result.watchlist ? [...result.watchlist, stock] : [stock];
      chrome.storage.local.set({ watchlist: updatedList });
    });
    stockInput.value = "";
  }
});

// Load watchlist from Chrome's local storage
chrome.storage.local.get(["watchlist"], (result) => {
  const watchlist = result.watchlist || [];
  if (watchlist.length === 0) {
    console.log("Watchlist is empty.");
    return;
  }

  watchlist.forEach((stock) => {
    fetchStock(stock);
  });
});

