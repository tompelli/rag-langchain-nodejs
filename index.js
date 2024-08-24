require('dotenv').config()

const { chunkTexts } = require('./src/chunk-texts');
const { embedTexts } = require('./src/embed-texts');
const { extractTextsFromPDF } = require('./src/parse-pdf');
const { checkIndexExists, createIndex, describeIndexStats, retrieveRelevantChunks, storeEmbeddings } = require('./src/vector-db');

const processPdf = async (pdfpath = './pdfs/basic-concepts-gst.pdf') => {
  console.log('Processing PDF', pdfpath)
  const pdfTexts = await extractTextsFromPDF(pdfpath);
  const pdfChunks = chunkTexts(pdfTexts);
  const embeddings = await embedTexts(pdfChunks)
  await storeEmbeddings(embeddings);
}

const init = async () => {
  const indexExists = await checkIndexExists();
  console.log('Index exists', indexExists)
  if (!indexExists) {
    await createIndex();
  } else {
    const indexStats = await describeIndexStats()
    console.log('Index stats', indexStats)
  }
  // for a test query, retrieve embeddings
  const query = 'What is GST?'; // it should match processed PDFs
  const relevantChunksMatchingQuery = await retrieveRelevantChunks(query);
  console.log(`Chunks matching for query "${query}"`, relevantChunksMatchingQuery)
  if (!relevantChunksMatchingQuery.length) {
    console.log('No matching chunks found, Need to parse PDF and store embeddings')
    console.log('call processPdf function')
    await processPdf()
  }
}

init().then(() => {
  console.log('Success')
}).catch(error => {
  console.log(error);
})
