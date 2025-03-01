import { Pinecone } from '@pinecone-database/pinecone';
import { storePineconeIds, getPineconeIdsByFilePath, deletePineconeIdsByFilePath } from "@/app/db";

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Get a reference to your index
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

/**
 * Inserts document chunks with their embeddings into Pinecone
 * Used for storing processed document fragments for retrieval-augmented generation
 * @param chunks - Array of document chunks with embeddings
 * @returns Promise resolving to the result of the upsert operation
 */
export async function insertChunksToPinecone({ chunks }: { chunks: any[] }) {
  // Transform chunks to Pinecone's expected format
  const vectors = chunks.map(chunk => ({
    id: chunk.id,
    values: chunk.embedding,
    metadata: {
      filePath: chunk.filePath,
      content: chunk.content,
    }
  }));
  
  // Get unique file path (should be the same for all chunks in a batch)
  const filePath = chunks[0]?.filePath;
  
  // Get all vector IDs for this file path
  const vectorIds = vectors.map(vector => vector.id);
  
  // Store the vector IDs in PostgreSQL
  if (filePath && vectorIds.length > 0) {
    await storePineconeIds({ filePath, ids: vectorIds });
  }
  
  // Upsert vectors to Pinecone
  return await index.upsert(vectors);
}

/**
 * Retrieves document chunks by their file paths using Pinecone
 * @param filePaths - Array of file paths to retrieve chunks for
 * @returns Promise resolving to an array of chunk records
 */
export async function getChunksByFilePathsFromPinecone({
  filePaths,
}: {
  filePaths: Array<string>;
}) {
  // Query Pinecone for chunks matching the file paths
  const results = await index.query({
    vector: new Array(1536).fill(0), // Dummy vector for metadata-only query
    topK: 1000, // Adjust based on your needs
    filter: {
      filePath: { $in: filePaths }
    },
    includeMetadata: true
  });
  
  // Transform results to match your application's expected format
  return results.matches.map(match => ({
    id: match.id,
    filePath: match.metadata?.filePath || '',
    content: match.metadata?.content || '',
    // Note: The actual embedding vector isn't typically needed after retrieval
  }));
}

/**
 * Deletes all chunks associated with a specific file path from Pinecone
 * @param filePath - The file path whose chunks should be deleted
 * @returns Promise resolving to the result of the delete operation
 */
export async function deleteChunksByFilePathFromPinecone({
  filePath,
}: {
  filePath: string;
}) {
  try {
    // Get the stored IDs from PostgreSQL
    const storedIds = await getPineconeIdsByFilePath({ filePath });
    let deletedCount = 0;
    
    if (storedIds.length > 0) {
      // Delete in batches of 100
      const batchSize = 100;
      
      for (let i = 0; i < storedIds.length; i += batchSize) {
        const batch = storedIds.slice(i, i + batchSize);
        try {
          // Use deleteOne for each ID instead of deleteMany with metadata filtering
          for (const id of batch) {
            try {
              await index.deleteOne(id);
              deletedCount++;
            } catch (singleDeleteError) {
              console.error(`Error deleting vector ${id}:`, singleDeleteError);
            }
          }
        } catch (batchError) {
          console.error(`Error processing batch:`, batchError);
        }
      }
    }
    
    // Clean up PostgreSQL records
    await deletePineconeIdsByFilePath({ filePath });
    
    return { success: true, deletedCount };
  } catch (error) {
    console.error(`Error deleting from Pinecone:`, error);
    
    // Still try to clean up PostgreSQL records even if Pinecone operations failed
    try {
      await deletePineconeIdsByFilePath({ filePath });
    } catch (dbError) {
      console.error(`Error deleting tracking records from PostgreSQL:`, dbError);
    }
    
    return { success: false, error };
  }
}

/**
 * Performs a semantic search in Pinecone using a query vector
 * @param queryVector - The embedding vector of the search query
 * @param topK - Number of results to return
 * @param filter - Optional metadata filter
 * @returns Promise resolving to the search results
 */
export async function searchPinecone({
  queryVector,
  topK = 5,
  filter = {}
}: {
  queryVector: number[];
  topK?: number;
  filter?: any;
}) {
  const results = await index.query({
    vector: queryVector,
    topK,
    filter,
    includeMetadata: true
  });
  
  return results.matches.map(match => ({
    id: match.id,
    filePath: match.metadata?.filePath || '',
    content: match.metadata?.content || '',
    score: match.score
  }));
} 