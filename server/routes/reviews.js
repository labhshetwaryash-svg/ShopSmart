const express = require('express');
const axios = require('axios');
const { analyzeReviews } = require('../utils/sentiment');
const { getProductHistory } = require('../utils/priceHistory');
const {
  analyzePriceIntegrity,
  analyzeStoreDisparity,
  generateAIRecommendation,
  analyzeAspects,
  analyzeReviewCredibility,
  calculateVFMIndex,
} = require('../utils/researchAI');

const router = express.Router();

const SERP_TIMEOUT = 30000;

router.get('/', async (req, res) => {
  try {
    const { product_id, q, page_token } = req.query;

    if (!product_id && !q && !page_token) {
      return res.status(400).json({
        message: 'Product ID, query, or page token is required',
      });
    }

    const searchQuery = q || product_id;
    let pageToken = page_token || null;
    let shoppingResults = [];

    // If the frontend already has the exact immersive token, use it directly.
    // This avoids searching Google Shopping again with a long/ambiguous product title.
    if (pageToken) {
      console.log('STEP 1: Using exact immersive product page token from frontend');
      console.log('Page Token Found:', true);
    } else {
      console.log('STEP 1: Starting reviews request for query:', searchQuery);

      const searchResponse = await axios.get('https://serpapi.com/search', {
        params: {
          engine: 'google_shopping',
          q: searchQuery,
          gl: 'in',
          hl: 'en',
          api_key: process.env.SERP_API_KEY,
        },
        timeout: SERP_TIMEOUT,
      });

      console.log('STEP 2: Search completed');

      shoppingResults = searchResponse.data.shopping_results || [];

      console.log('Shopping Results Count:', shoppingResults.length);
      console.log('Requested Product ID:', product_id);

      if (product_id) {
        const match = shoppingResults.find(
          (r) => String(r.product_id) === String(product_id)
        );

        console.log('Matched Product:', match?.title);
        console.log('Page Token Found:', !!match?.immersive_product_page_token);

        if (match?.immersive_product_page_token) {
          pageToken = match.immersive_product_page_token;
        }
      }

      if (
        !pageToken &&
        shoppingResults.length > 0 &&
        shoppingResults[0].immersive_product_page_token
      ) {
        pageToken = shoppingResults[0].immersive_product_page_token;
      }

      console.log('Page Token Found:', !!pageToken);

      if (!pageToken) {
        return res.status(404).json({ message: 'No product found' });
      }
    }

    console.log('STEP 3: Fetching immersive product data');

    const immersiveResponse = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google_immersive_product',
        page_token: pageToken,
        gl: 'in',
        hl: 'en',
        api_key: process.env.SERP_API_KEY,
      },
      timeout: SERP_TIMEOUT,
    });

    const productData = immersiveResponse.data.product_results;

    if (!productData) {
      return res.status(404).json({ message: 'No product data found' });
    }

    // SerpApi's Google Immersive Product response exposes user reviews
    // under product_results.user_reviews.
    const rawReviews = Array.isArray(productData.user_reviews)
      ? productData.user_reviews
      : [];

    console.log('Immersive product title:', productData.title);
    console.log('Immersive product review count:', rawReviews.length);

    // Always expose an array to the frontend/research functions.
    productData.user_reviews = rawReviews;

    console.log('STEP 4: Running review analysis and price history');

    const [analyzedReviews, historyResult] = await Promise.all([
      rawReviews.length > 0
        ? analyzeReviews(rawReviews)
        : Promise.resolve([]),
      Promise.resolve(
        getProductHistory(productData.title || searchQuery)
      ),
    ]);

    productData.user_reviews = analyzedReviews;

    console.log('Sentiment finished');

    // Research AI features
    productData.store_disparity = analyzeStoreDisparity(
      productData.user_reviews
    );
    console.log('Store disparity finished');

    const history = historyResult.success ? historyResult.data : [];
    productData.price_integrity = analyzePriceIntegrity(history);
    console.log('Price integrity finished');

    if (historyResult.success) {
      productData.ai_advisor = generateAIRecommendation(
        historyResult.analysis,
        productData.price_integrity,
        productData.store_disparity
      );
    }
    console.log('AI recommendation finished');

    productData.aspect_sentiment = analyzeAspects(
      productData.user_reviews
    );
    console.log('ABSA finished');

    productData.review_credibility = analyzeReviewCredibility(
      productData.user_reviews
    );
    console.log('Credibility finished');

    const matchedShoppingResult = shoppingResults.find(
      (r) => String(r.product_id) === String(product_id)
    );

    const currentPrice =
      matchedShoppingResult?.extracted_price ||
      shoppingResults[0]?.extracted_price ||
      productData.extracted_price ||
      parseFloat(
        String(productData.price || '').replace(/[^\d.]/g, '')
      ) ||
      0;

    productData.vfm_index = calculateVFMIndex(
      currentPrice,
      shoppingResults
    );
    console.log('VFM finished');

    console.log('STEP 5: Sending response');
    res.json(productData);
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error(
        'Reviews fetch error: SerpAPI request timed out after',
        SERP_TIMEOUT,
        'ms'
      );
      return res.status(504).json({
        message: 'SerpAPI request timed out',
        error: 'TIMEOUT',
      });
    }

    console.error('Reviews fetch error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });

    res.status(500).json({
      message: 'Failed to fetch reviews',
      error: error.message,
    });
  }
});

module.exports = router;
