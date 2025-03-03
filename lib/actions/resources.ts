'use server';


import { generateEmbedding } from '@/lib/ai/embedding';
import { index } from '@/lib/pinecone';










  export const updateResource = async (params: {
    searchQuery: string;
    newContent: string;
    context?: string;
  }) => {
    try {
      // Find the relevant chunks
      const userQueryEmbedded = await generateEmbedding(params.searchQuery);
      
      const queryResponse = await index.query({
        vector: userQueryEmbedded,
        topK: 5,
        includeMetadata: true,
      });
  
      const relevantMatches = queryResponse.matches;
  
      if (relevantMatches.length === 0) {
        throw new Error('Could not find matching content to update');
      }
  
      // Delete the old vectors
      const idsToDelete = relevantMatches.map(match => match.id);
      await index.deleteMany(idsToDelete);
  
      // Create new vectors with updated content
      const updates = await Promise.all(relevantMatches.map(async match => {
        const oldContent = match.metadata?.content as string;
        const updatedContent = oldContent.replace(
          new RegExp(escapeRegExp(params.searchQuery), 'i'),
          params.newContent
        );
  
        return {
          id: match.id,
          values: await generateEmbedding(updatedContent),
          metadata: {
            content: updatedContent,
          },
        };
      }));
  
      // Upsert the new vectors
      await index.upsert(updates);
  
      return {
        success: true,
        message: `Content updated successfully in ${updates.length} chunks`,
        updatedChunks: updates.length,
        oldContent: relevantMatches[0].metadata?.content,
        newContent: updates[0].metadata.content
      };
    } catch (error) {
      console.error('Error updating content:', error);
      throw new Error('Failed to update content: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  // Helper function to escape special regex characters
  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }