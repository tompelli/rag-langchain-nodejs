function chunkTexts(text, chunkSize = 1000, overlapSize = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    const chunk = text.slice(start, end);
    console.log('Chunk---------------->', chunk);
    chunks.push(chunk);
    start += chunkSize - overlapSize; // Move forward by chunkSize minus overlap
  }

  return chunks;
}

/*const chunkSize = 1000; // Adjust based on your embedding model's token limit
const overlapSize = 200; // Overlap size for context preservation
const chunks = chunkText(pdfText, chunkSize, overlapSize);*/

module.exports = {
  chunkTexts
}