require('dotenv').config()

const { embedTexts } = require('./src/embed-texts');
const { chunkText } = require('./src/chunk-texts');
const { extractTextFromPDF } = require('./src/parse-pdf')
const {
  storeEmbeddings,
  createIndex,
  describeIndexStats,
  retrieveRelevantChunks,
  checkIndexExists
} = require('./src/vector-db')

console.log('Test')