const { Pinecone } = require('@pinecone-database/pinecone');

const { embedTexts } = require('./embed-texts');

const DB_INDEX = 'rag-langchain-nodejs'
const NAMESPACE = 'test-namespace'

// https://docs.pinecone.io/guides/get-started/quickstart
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

async function storeEmbeddings(embeddings, namespace = NAMESPACE) {
  const index = pc.index(DB_INDEX);

  for (let i = 0; i < embeddings.length; i++) {
    await index.namespace(namespace).upsert([{
      id: `chunk-${i}`,
      values: embeddings[i],
      metadata: { namespace: namespace }
    }]);
  }
}

const createIndex = async () => {
  await pc.createIndex({
    name: DB_INDEX,

    // should match embedding model name, e.g. 3072 for OpenAI text-embedding-3-large and 1536 for OpenAI text-embedding-ada-002
    dimension: 3072,
    metric: 'cosine',
    spec: {
      serverless: {
        cloud: 'aws',
        region: 'us-east-1'
      }
    }
  });
  console.log('Index created', DB_INDEX)
}

async function checkIndexExists() {
  // List all indexes
  const response = await pc.listIndexes();
  const indexes = response.indexes;
  console.log('Available indexes:', indexes)

  // Check if the desired index is in the list
  return indexes.find(item => item.name === DB_INDEX);
}

const describeIndexStats = async () => {
  const index = pc.index(DB_INDEX);
  const stats = await index.describeIndexStats();
  return stats;
}

async function retrieveRelevantChunks(query, namespace = NAMESPACE) {
  const queryEmbedding = await embedTexts([query]);
  const index = pc.index(DB_INDEX);
  const results = await index.namespace(namespace).query({
    vector: queryEmbedding,
    topK: 5, // Number of relevant chunks to retrieve
    includeValues: true
  });

  return results.matches.map(match => match.metadata.text);
}

// Storing embeddings in Pinecone
//await storeEmbeddings(embeddings, 'your-namespace');

module.exports = {
  storeEmbeddings,
  createIndex,
  describeIndexStats,
  retrieveRelevantChunks,
  checkIndexExists
}
