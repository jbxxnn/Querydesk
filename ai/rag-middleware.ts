import { auth } from "@/app/(auth)/auth";
// import { getChunksByFilePaths } from "@/app/db";
import { getChunksByFilePathsFromPinecone, getAllChunksFromPinecone } from "@/app/pinecone";
import { openai } from "@ai-sdk/openai";
import {
  cosineSimilarity,
  embed,
  Experimental_LanguageModelV1Middleware,
  generateObject,
  generateText,
} from "ai";
import { z } from "zod";

// Schema for validating the custom provider metadata
// Ensures the files selection data is properly formatted
const selectionSchema = z.object({
  files: z.object({
    selection: z.array(z.string()),
  }),
});

/**
 * RAG (Retrieval-Augmented Generation) Middleware
 * Enhances AI responses by retrieving relevant context from selected files
 * Uses Hypothetical Document Embeddings technique for improved retrieval
 */
export const ragMiddleware: Experimental_LanguageModelV1Middleware = {
  transformParams: async ({ params }) => {
    // Get the current user session
    const session = await auth();

    // Skip RAG if no user is authenticated
    if (!session) return params; // no user session

    // Extract messages and provider metadata from params
    const { prompt: messages, providerMetadata } = params;

    // Validate the provider metadata using the defined schema
    const { success, data } = selectionSchema.safeParse(providerMetadata);

    // Skip RAG if validation fails (no files selected)
    if (!success) return params; // no files selected

    // Get the most recent message from the conversation
    const recentMessage = messages.pop();

    // Ensure the most recent message exists and is from the user
    // If not, restore the message and return unmodified params
    if (!recentMessage || recentMessage.role !== "user") {
      if (recentMessage) {
        messages.push(recentMessage);
      }
      return params;
    }

    // Extract text content from the user's message
    const lastUserMessageContent = recentMessage.content
      .filter((content) => content.type === "text")
      .map((content) => content.text)
      .join("\n");

    // Classify the user's message to determine if RAG is needed
    const { object: classification } = await generateObject({
      model: openai("gpt-4o-mini", { structuredOutputs: true }),
      output: "enum",
      enum: ["question", "statement", "other"],
      system: "classify the user message as a question, statement, or other",
      prompt: lastUserMessageContent,
    });

    // Only apply RAG for questions, skip for other message types
    if (classification !== "question") {
      messages.push(recentMessage);
      return params;
    }

    // Generate hypothetical answer
    const { text: hypotheticalAnswer } = await generateText({
      model: openai("gpt-4o-mini", { structuredOutputs: true }),
      system: "Answer the users question:",
      prompt: lastUserMessageContent,
    });

    // Create embedding for hypothetical answer
    const { embedding: hypotheticalAnswerEmbedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: hypotheticalAnswer,
    });

    // Retrieve all available document chunks from Pinecone
    // const chunksBySelection = await getChunksByFilePathsFromPinecone({
    //   filePaths: selection.map((path) => `${session.user?.email}/${path}`),
    // });
    const allChunks = await getAllChunksFromPinecone();

    // Generate embeddings for each retrieved chunk
    const chunksWithEmbeddings = await Promise.all(
      // chunksBySelection.map(async (chunk) => {
      allChunks.map(async (chunk) => {
        const { embedding } = await embed({
          model: openai.embedding("text-embedding-3-small"),
          value: chunk.content.toString(),
        });
        return { ...chunk, embedding };
      })
    );

    // Calculate similarity between each chunk and the hypothetical answer
    const chunksWithSimilarity = chunksWithEmbeddings.map((chunk) => ({
      ...chunk,
      similarity: cosineSimilarity(
        hypotheticalAnswerEmbedding,
        chunk.embedding,
      ),
    }));

    // Sort chunks by similarity score (highest first)
    chunksWithSimilarity.sort((a, b) => b.similarity - a.similarity);
    
    // Select the top K most relevant chunks
    const k = 10;
    const topKChunks = chunksWithSimilarity.slice(0, k);

    // Augment the user's message with the retrieved context
    messages.push({
      role: "user",
      content: [
        ...recentMessage.content,
        {
          type: "text",
          text: "Here is some relevant information that you can use to answer the question:",
        },
        // Add each chunk as a separate text content part
        // Ensures content is properly converted to string
        ...topKChunks.map((chunk) => ({
          type: "text" as const,
          text: typeof chunk.content === 'string' ? chunk.content : String(chunk.content),
        })),
      ],
    });

    // Return the modified parameters with augmented messages
    return { ...params, prompt: messages };
  },
};
