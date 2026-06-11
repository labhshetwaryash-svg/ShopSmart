const { pipeline } = require('@xenova/transformers');

let sentimenlet sentimentPipeline = null;
let pipelinePromise = null;tPipeline = null;

/**
 * Get or initialize the sentiment analysis pipeline.
 */
async function getPipeline() {
  if (!sentimentPipeline) {
    console.log('Initializing sentiment analysis pipeline...');
    // Using Xenova/bert-base-multilingual-uncased-sentiment for Transformers.js compatibility
    sentimentPipeline = await pipeline('sentiment-analysis', 'Xenova/bert-base-multilingual-uncased-sentiment');
    console.log('Sentiment analysis pipeline initialized.');
  }
  return sentimentPipeline;
}

/**
 * Analyzes the sentiment of a given text.
 * @param {string} text - The text to analyze.
 * @returns {Promise<{label: string, score: number, stars: number}>}
 */
async function analyzeSentiment(text) {
  try {
    if (!text || typeof text !== 'string') {
      return { label: 'neutral', score: 0, stars: 3 };
    }

    const classifier = await getPipeline();
    const result = await classifier(text.substring(0, 512));
    
    const sentiment = result[0];
    // nlptown/bert-base-multilingual-uncased-sentiment labels are '1 star', '2 stars', etc.
    const stars = parseInt(sentiment.label[0]);
    
    let label = 'neutral';
    if (stars <= 2) label = 'negative';
    else if (stars >= 4) label = 'positive';

    return {
      label,
      score: sentiment.score,
      stars
    };
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return { label: 'unknown', score: 0, stars: 0 };
  }
}

/**
 * Analyzes a batch of reviews.
 * @param {Array} reviews - Array of review objects.
 * @returns {Promise<Array>} - Reviews with sentiment added.
 */
async function analyzeReviews(reviews) {
  if (!reviews || !Array.isArray(reviews)) return reviews;

  // Process in parallel with a limit to avoid overloading
  const processedReviews = await Promise.all(
    reviews.map(async (review) => {
      if (review.text) {
        const sentiment = await analyzeSentiment(review.text);
        return { ...review, sentiment };
      }
      return review;
    })
  );

  return processedReviews;
}

module.exports = {
  analyzeSentiment,
  analyzeReviews
};
