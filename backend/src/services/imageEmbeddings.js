async function createEmbedding(imageUrl) {
  if (!process.env.IMAGE_EMBEDDING_URL) return null;
  const sourceUrl = new URL(imageUrl, process.env.PUBLIC_API_URL || 'http://localhost:4000').toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(process.env.IMAGE_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.IMAGE_EMBEDDING_TOKEN ? { authorization: `Bearer ${process.env.IMAGE_EMBEDDING_TOKEN}` } : {}),
      },
      body: JSON.stringify({ imageUrl: sourceUrl }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Image embedding service returned ${response.status}.`);
    const body = await response.json();
    if (!Array.isArray(body.embedding) || !body.embedding.length || !body.embedding.every(Number.isFinite)) {
      throw new Error('Image embedding service returned an invalid embedding.');
    }
    return body.embedding;
  } finally {
    clearTimeout(timeout);
  }
}

async function createItemEmbeddings(images) {
  if (!process.env.IMAGE_EMBEDDING_URL) return null;
  const embeddings = [];
  for (const image of images) {
    const embedding = await createEmbedding(image.url);
    if (embedding) embeddings.push(embedding);
  }
  return embeddings.length ? embeddings : null;
}

function cosineSimilarity(left, right) {
  if (!left?.length || left.length !== right?.length) return null;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  if (!leftNorm || !rightNorm) return null;
  return Math.max(0, Math.min(1, dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))));
}

function bestVisualSimilarity(left, right) {
  if (!left?.length || !right?.length) return null;
  let best = null;
  for (const leftEmbedding of left) {
    for (const rightEmbedding of right) {
      const score = cosineSimilarity(leftEmbedding, rightEmbedding);
      if (score !== null && (best === null || score > best)) best = score;
    }
  }
  return best;
}

module.exports = { createItemEmbeddings, bestVisualSimilarity };
