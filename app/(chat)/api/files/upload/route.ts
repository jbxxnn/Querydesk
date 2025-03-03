import { auth } from "@/app/(auth)/auth";
import { insertChunks } from "@/app/db";
import { getPdfContentFromUrl } from "@/utils/pdf";
import { openai } from "@ai-sdk/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { put } from "@vercel/blob";
import { embedMany } from "ai";
import { insertChunksToPinecone } from "@/app/pinecone";

/**
 * API route handler for file uploads
 * This function processes PDF file uploads, extracts text, generates embeddings, and stores them in the database
 */
export async function POST(request: Request) {
  try {
    // Extract filename from URL query parameters
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    // Verify user authentication
    let session = await auth();

    // Redirect to login if no session exists
    if (!session) {
      return Response.redirect("/login");
    }

    const { user } = session;

    // Redirect to login if no user in session
    if (!user) {
      return Response.redirect("/login");
    }

    // Check if request body exists
    if (request.body === null) {
      return Response.json({ 
        success: false, 
        message: "Request body is empty" 
      }, { status: 400 });
    }

    // Sanitize the filename to ensure it's safe for storage
    const sanitizedFilename = encodeURIComponent(filename || "").replace(/%20/g, " ");
    
    // Determine the blob storage path with proper sanitization
    const blobPath = `${user.email}/${sanitizedFilename}`;
    
    // Upload file to Vercel Blob storage
    // - Creates a path using user email and filename
    // - Makes the file publicly accessible
    // - Returns the download URL for the uploaded file
    const { downloadUrl, pathname } = await put(blobPath, request.body, {
      access: "public",
      addRandomSuffix: false, // Prevent random suffix to maintain consistent paths
    });

    try {
      // Extract text content from the uploaded PDF file
      const content = await getPdfContentFromUrl(downloadUrl);
      
      // Initialize text splitter to break content into manageable chunks
      // - chunkSize: 1000 characters per chunk
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
      });
      
      // Split the PDF content into chunks
      const chunkedContent = await textSplitter.createDocuments([content]);

      // Generate embeddings for all chunks using OpenAI's embedding model
      // - embedMany: Processes multiple text chunks in a single API call
      // - model: Uses text-embedding-3-small for vector embeddings
      // - values: Array of text chunks to embed
      const { embeddings } = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values: chunkedContent.map((chunk) => chunk.pageContent),
      });

      // Store chunks and their embeddings in the database
      const chunks = chunkedContent.map((chunk, i) => ({
        id: `${pathname}/${i}`,
        filePath: pathname,
        content: chunk.pageContent,
        embedding: embeddings[i],
      }));
      
      // Store in database
      await insertChunks({ chunks });

      // Also store in Pinecone
      await insertChunksToPinecone({ chunks });

      // Return success response
      return Response.json({ success: true });
    } catch (pdfError) {
      // Return a partial success - file was uploaded but processing failed
      return Response.json({ 
        success: false, 
        message: "File uploaded but content processing failed",
        fileUrl: downloadUrl
      }, { status: 202 });
    }
  } catch (error) {
    return Response.json({ 
      success: false, 
      message: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }, { status: 500 });
  }
}
