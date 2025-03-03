import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { index } from '@/lib/pinecone';

const embeddingModel = openai.embedding('text-embedding-ada-002');



export const generateEmbedding = async (value: string): Promise<number[]> => {
  console.log('Generating embedding for:', value);
  const input = value.replaceAll('\\n', ' ');
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  console.log('Generated embedding length:', embedding.length);
  return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
  console.log('Finding relevant content for query:', userQuery);
  
  const userQueryEmbedded = await generateEmbedding(userQuery);
  
  const queryResponse = await index.query({
    vector: userQueryEmbedded,
    topK: 4,
    includeMetadata: true,
  });

  return queryResponse.matches.map(match => ({
    name: match.metadata?.content || '',
    similarity: match.score || 0
  }));
};