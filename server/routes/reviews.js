const express = require('express');
const axios = require('axios');
const { analyzeReviews } = require('../utils/sentiment');
const { getProductHistory } = require('../utils/priceHistory');
const { analyzePriceIntegrity, analyzeStoreDisparity, generateAIRecommendation, analyzeAspects, analyzeReviewCredibility, calculateVFMIndex } = require('../utils/researchAI');

const router = express.Router();

// Timeout for all SerpAPI requests (10 seconds)
const SERP_TIMEOUT = 10000;

router.get('/', async (req, res) => {
  try {
    const { product_id, q } = req.query;

    if (!product_id && !q) {
      return res.status(400).json({ message: 'Product ID or query is required' });
    }

    const searchQuery = q || product_id;

    // ── STEP 1: Search google_shopping to find the immersive_product_page_token ──
    console.log('STEP 1: Starting reviews request for query:', searchQuery);

    const searchParams = {
      engine: 'google_shopping',
      q: searchQuery,
      gl: 'in',
      hl: 'en',
      api_key: process.env.SERP_API_KEY,
    };

    const searchResponse = await axios.get('https://serpapi.com/search', {
      params: searchParams,
      timeout: SERP_TIMEOUT,
    });

    console.log('STEP 2: Search completed');

    const shoppingResults = searchResponse.data.shopping_results || [];

    // Debug: log how many results came back and the first product ID
    console.log('Shopping Results Count:', shoppingResults.length);
    if (shoppingResults.length > 0) {
      console.log('First Result Product ID:', shoppingResults[0].product_id);
    }

    let pageToken = null;

    if (product_id) {
      // Match safely even if one is a string and the other is a number
      const match = shoppingResults.find(
        (r) => String(r.product_id) === String(product_id)
      );

      console.log('Requested Product ID:', product_id);
      console.log('Matched Product:', match?.title);
      console.log('Page Token Found:', !!match?.immersive_product_page_token);

      if (match?.immersive_product_page_token) {
        pageToken = match.immersive_product_page_token;
      }
    }

    // Fallback: use first result's token if no exact match
    if (!pageToken && shoppingResults.length > 0 && shoppingResults[0].immersive_product_page_token) {
      pageToken = shoppingResults[0].immersive_product_page_token;
    }

    if (!pageToken) {
      return res.status(404).json({ message: 'No product found' });
    }

    // ── STEP 2: Fetch detailed product data using google_immersive_product ──
    console.log('STEP 3: Fetching immersive product data');

    const immersiveParams = {
      engine: 'google_immersive_product',
      page_token: pageToken,
      gl: 'in',
      hl: 'en',
      api_key: process.env.SERP_API_KEY,
    };

    const immersiveResponse = await axios.get('https://serpapi.com/search', {
      params: immersiveParams,
      timeout: SERP_TIMEOUT,
    });

    const productData = immersiveResponse.data.product_results;

    if (!productData) {
      return res.status(404).json({ message: 'No product data found' });
    }

    // ── STEP 3: Run analyzeReviews and getProductHistory in parallel ──
    console.log('STEP 4: Running ABSA and parallel tasks');

    const hasReviews = productData.user_reviews && productData.user_reviews.length > 0;

    if (hasReviews) {
      console.log(`Analyzing sentiment for ${productData.user_reviews.length} reviews...`);
    }

    // analyzeReviews and getProductHistory are independent — run them together
    const [analyzedReviews, historyResult] = await Promise.all([
      hasReviews
        ? analyzeReviews(productData.user_reviews)
        : Promise.resolve([]),
      Promise.resolve(getProductHistory(productData.title || searchQuery)),
    ]);

    if (hasReviews) {
      productData.user_reviews = analyzedReviews;
    }

    // ── STEP 4: Research AI Features (all synchronous — runs in milliseconds) ──

    // 1. Store Disparity
    productData.store_disparity = analyzeStoreDisparity(productData.user_reviews);

    // 2. Price Integrity
    const history = historyResult.success ? historyResult.data : [];
    productData.price_integrity = analyzePriceIntegrity(history);

    // 3. XAI Recommendation
    if (historyResult.success) {
      productData.ai_advisor = generateAIRecommendation(
        historyResult.analysis,
        productData.price_integrity,
        productData.store_disparity
      );
    }

    // 4. Aspect-Based Sentiment Analysis (ABSA)
    productData.aspect_sentiment = analyzeAspects(productData.user_reviews);

    // 5. Review Credibility
    productData.review_credibility = analyzeReviewCredibility(productData.user_reviews);

    // 6. Value-for-Money Index
    const currentPrice =
      shoppingResults.find((r) => r.product_id === product_id)?.extracted_price ||
      (shoppingResults.length > 0 ? shoppingResults[0].extracted_price : 0);
    productData.vfm_index = calculateVFMIndex(currentPrice, shoppingResults);

    console.log('STEP 5: Sending response');
    res.json(productData);

  } catch (error) {
    // Distinguish timeout errors from other failures for clearer Render logs
    if (error.code === 'ECONNABORTED') {
      console.error('Reviews fetch error: SerpAPI request timed out after', SERP_TIMEOUT, 'ms');
      return res.status(504).json({ message: 'SerpAPI request timed out', error: 'TIMEOUT' });
    }

    console.error('Reviews fetch error:', error.message);
    res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
  }
});

module.exports = router;
