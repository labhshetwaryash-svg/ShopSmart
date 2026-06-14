const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Directory to store store-based price history Excel files
const PRICE_HISTORY_DIR = path.join(__dirname, '../data/price-history/stores');

// Ensure the price history directory exists
const ensureDirectoryExists = () => {
  if (!fs.existsSync(PRICE_HISTORY_DIR)) {
    fs.mkdirSync(PRICE_HISTORY_DIR, { recursive: true });
    console.log('Created store price history directory:', PRICE_HISTORY_DIR);
  }
};

/**
 * Sanitize a store name to create a safe filename
 * e.g., "Amazon.in" => "amazon_in", "Flipkart" => "flipkart"
 */
const sanitizeStoreName = (storeName) => {
  return storeName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * Get the file path for a store's Excel file
 */
const getStoreFilePath = (storeName) => {
  const safe = sanitizeStoreName(storeName);
  return path.join(PRICE_HISTORY_DIR, `${safe}_price_history.xlsx`);
};

/**
 * Log product price to the store-specific Excel file.
 * Creates a new file if the store hasn't been seen before.
 * @param {Object} product - Product object with id, name, price, store, image, link
 * @param {string} query - Search query used
 */
const logProductPriceToStore = async (product, query) => {
  try {
    ensureDirectoryExists();

    const storeName = product.store || 'Unknown';
    const filePath = getStoreFilePath(storeName);

    const timestamp = new Date().toISOString();
    const date = new Date().toLocaleDateString('en-IN');
    const time = new Date().toLocaleTimeString('en-IN');

    const newRow = {
      Timestamp: timestamp,
      Date: date,
      Time: time,
      'Product ID': product.id || 'N/A',
      'Product Name': product.name || 'Unknown',
      'Price (INR)': product.extractedPrice || (product.price ? Number(product.price) : 0),
      Store: storeName,
      'Search Query': query || 'N/A',
      'Image URL': product.image || '',
      'Product Link': product.link || '',
    };

    let workbook;
    let existingData = [];

    if (fs.existsSync(filePath)) {
      workbook = XLSX.readFile(filePath);
      const ws = workbook.Sheets[workbook.SheetNames[0]];
      existingData = XLSX.utils.sheet_to_json(ws);
    } else {
      workbook = XLSX.utils.book_new();
    }

    existingData.push(newRow);

    const newWorksheet = XLSX.utils.json_to_sheet(existingData);

    // Column widths for readability
    newWorksheet['!cols'] = [
      { wch: 25 }, // Timestamp
      { wch: 12 }, // Date
      { wch: 12 }, // Time
      { wch: 15 }, // Product ID
      { wch: 45 }, // Product Name
      { wch: 14 }, // Price (INR)
      { wch: 18 }, // Store
      { wch: 25 }, // Search Query
      { wch: 35 }, // Image URL
      { wch: 35 }, // Product Link
    ];

    if (workbook.SheetNames.length > 0) {
      workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;
    } else {
      const sheetName = `${storeName} Price History`.substring(0, 31);

      XLSX.utils.book_append_sheet(
        workbook,
        newWorksheet,
        sheetName
      );
    }

    XLSX.writeFile(workbook, filePath);
    console.log(`✓ Logged price for "${product.name}" → ${path.basename(filePath)}`);

    return { success: true, filePath, store: storeName };
  } catch (error) {
    console.error('Error logging product price to store file:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get price history for a specific product from a specific store's file.
 * @param {string} productName - Product name to search for
 * @param {string} storeName - Store name (e.g. "Amazon", "Flipkart")
 * @returns {Object} - History data and analysis
 */
const getStoreProductHistory = (productName, storeName) => {
  try {
    ensureDirectoryExists();

    const filePath = getStoreFilePath(storeName);

    if (!fs.existsSync(filePath)) {
      return { success: true, data: [], analysis: null };
    }

    const workbook = XLSX.readFile(filePath);
    const ws = workbook.Sheets[workbook.SheetNames[0]];
    const allData = XLSX.utils.sheet_to_json(ws);

    const productData = allData.filter(
      (row) =>
        row['Product Name'] &&
        row['Product Name'].toLowerCase().includes(productName.toLowerCase())
    );

    if (productData.length === 0) {
      return { success: true, data: [], analysis: null };
    }

    return analyzeProductData(productData, productName);
  } catch (error) {
    console.error('Error reading store product history:', error);
    return { success: true, data: [], analysis: null };
  }
};

/**
 * Get price history for a product across ALL stores.
 * @param {string} productName
 * @returns {Object}
 */
const getAllStoresProductHistory = (productName) => {
  try {
    ensureDirectoryExists();

    const files = fs.existsSync(PRICE_HISTORY_DIR)
      ? fs.readdirSync(PRICE_HISTORY_DIR).filter((f) => f.endsWith('.xlsx'))
      : [];

    let allData = [];

    for (const file of files) {
      const filePath = path.join(PRICE_HISTORY_DIR, file);
      try {
        const workbook = XLSX.readFile(filePath);
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        const matched = data.filter(
          (row) =>
            row['Product Name'] &&
            row['Product Name'].toLowerCase().includes(productName.toLowerCase())
        );
        allData = allData.concat(matched);
      } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
      }
    }

    if (allData.length === 0) {
      return { success: true, data: [], analysis: null };
    }

    return analyzeProductData(allData, productName);
  } catch (error) {
    console.error('Error reading all stores product history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get list of all known store names (from existing Excel files)
 */
const getKnownStores = () => {
  try {
    ensureDirectoryExists();
    if (!fs.existsSync(PRICE_HISTORY_DIR)) return [];
    const files = fs.readdirSync(PRICE_HISTORY_DIR).filter((f) => f.endsWith('.xlsx'));
    return files.map((f) => {
      // Reverse-engineer store name from filename: "amazon_in_price_history.xlsx" -> read first row's Store column
      const filePath = path.join(PRICE_HISTORY_DIR, f);
      try {
        const workbook = XLSX.readFile(filePath);
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length > 0 && data[0].Store) {
          return data[0].Store;
        }
      } catch (e) {}
      return null;
    }).filter(Boolean);
  } catch (error) {
    return [];
  }
};

/**
 * Analyze product data and generate insights
 */
const analyzeProductData = (productData, productName) => {
  if (!productData || productData.length === 0) {
    return {
      success: true,
      data: [],
      analysis: {
        currentPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        avgPrice: 0,
        isBestTimeToBuy: false,
        trend: 'stable',
        trendPercentage: 0,
        totalRecords: 0,
        recommendation: 'No price history available yet. Start tracking by searching for this product.',
      },
    };
  }

  productData.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));

  const prices = productData.map((row) => parseFloat(row['Price (INR)']) || 0);
  const currentPrice = prices[prices.length - 1];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  const priceRange = maxPrice - minPrice;
  const priceThreshold = minPrice + priceRange * 0.2;
  const isBestTimeToBuy = currentPrice <= priceThreshold;

  let trend = 'stable';
  let trendPercentage = 0;
  if (prices.length >= 3) {
    const recent = prices.slice(-3);
    if (recent[2] < recent[1] && recent[1] < recent[0]) {
      trend = 'decreasing';
      trendPercentage = ((recent[0] - recent[2]) / recent[0] * 100).toFixed(1);
    } else if (recent[2] > recent[1] && recent[1] > recent[0]) {
      trend = 'increasing';
      trendPercentage = ((recent[2] - recent[0]) / recent[0] * 100).toFixed(1);
    }
  }

  return {
    success: true,
    data: productData,
    analysis: {
      currentPrice,
      minPrice,
      maxPrice,
      avgPrice: Math.round(avgPrice),
      isBestTimeToBuy,
      trend,
      trendPercentage,
      totalRecords: productData.length,
      recommendation: isBestTimeToBuy
        ? `🎉 Great time to buy! Current price (₹${currentPrice}) is near the lowest recorded price (₹${minPrice}).`
        : trend === 'increasing'
        ? `⚠️ Prices are rising! Consider buying soon. Current price (₹${currentPrice}) is higher than usual.`
        : `📊 Price is stable. Current price (₹${currentPrice}) is around average (₹${Math.round(avgPrice)}).`,
    },
  };
};

module.exports = {
  logProductPriceToStore,
  getStoreProductHistory,
  getAllStoresProductHistory,
  getKnownStores,
  sanitizeStoreName,
};
