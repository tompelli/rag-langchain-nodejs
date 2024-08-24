const { OpenAI } = require('langchain');

async function generateAnswer(retrievedChunks) {
  const context = retrievedChunks.join(' ');
  const generator = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const answer = await generator.generate({
    prompt: context,
    maxTokens: 150, // Adjust based on the expected response length
  });

  return answer;
}

//const finalAnswer = await generateAnswer(relevantChunks);
module.exports = {
  generateAnswer
}