const express = require('express');
const axios = require('axios');
const { logProductPriceToStore } = require('../utils/storePriceHistory');

const router = express.Router();

// Search products using SERP API
router.get('/', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const response = await axios.get('https://serpapi.com/search', {
      params: {
        q: query,
        engine: 'google_shopping',
        google_domain: 'google.co.in',
        gl: 'in',
        hl: 'en',
        api_key: process.env.SERP_API_KEY,
      },
    });

    const products = response.data.shopping_results || [];

    if (products.length === 0) {
      return res.status(404).json({ message: 'No products found' });
    }

    // Format ALL results (not just 10) with full SerpAPI data
    const formattedProducts = products.map((product) => {
      // Use extracted_price (already numeric) — fallback to parsing price string
      let numPrice = product.extracted_price || 0;
      if (!numPrice && product.price) {
        const cleaned = String(product.price).replace(/[^\d.]/g, '');
        numPrice = parseFloat(cleaned) || 0;
      }

      // Old/original price
      let oldPrice = product.extracted_old_price || null;

      // Calculate discount %
      let discountPercent = null;
      if (oldPrice && numPrice && oldPrice > numPrice) {
        discountPercent = Math.round(((oldPrice - numPrice) / oldPrice) * 100);
      }

      return {
        id: product.product_id || String(Math.random()),
        name: product.title || 'Unknown Product',
        // SerpApi token for the exact product
        immersiveProductPageToken: product.immersive_product_page_token || null,
        // Keep this too if needed later
        serpapiImmersiveProductApi: product.serpapi_immersive_product_api || null,
        price: numPrice.toString(),
        extractedPrice: numPrice,
        oldPrice: oldPrice ? oldPrice.toString() : null,
        extractedOldPrice: oldPrice,
        discountPercent,
        image: product.thumbnail || product.serpapi_thumbnail || '',
        link: product.product_link || product.link || product.serpapi_link || null,
        store: product.source || 'Unknown',
        sourceIcon: product.source_icon || null,
        rating: product.rating || null,
        reviews: product.reviews || null,
        secondHandCondition: product.second_hand_condition || null,
        tag: product.tag || null,
        extensions: product.extensions || [],
        multipleSources: product.multiple_sources || false,
        position: product.position || 0,
      };
    });

    // Log each product to its store-specific Excel file (first 20 to avoid abuse)
    formattedProducts.slice(0, 20).forEach((product) => {
      logProductPriceToStore(product, query).catch((err) => {
        console.error('Failed to log product price to store file:', err);
      });
    });

    res.json({
      query,
      results: formattedProducts,
      totalResults: products.length,
    });
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ message: 'Search failed', error: error.message });
  }
});

module.exports = router;
