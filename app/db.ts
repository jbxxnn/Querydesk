import { drizzle } from "drizzle-orm/postgres-js";
import { desc, eq, inArray } from "drizzle-orm";
import postgres from "postgres";
import { genSaltSync, hashSync } from "bcrypt-ts";
import { chat, chunk, user, pineconeIds } from "@/schema";

// Establish connection to PostgreSQL database
// Uses the POSTGRES_URL environment variable with SSL enabled
let client = postgres(`${process.env.POSTGRES_URL!}?sslmode=require`);
// Initialize Drizzle ORM with the PostgreSQL client
let db = drizzle(client);

/**
 * Retrieves a user from the database by email
 * @param email - The email address of the user to find
 * @returns Promise resolving to the user record(s)
 */
export async function getUser(email: string) {
  return await db.select().from(user).where(eq(user.email, email));
}

/**
 * Creates a new user in the database with hashed password
 * @param email - The email address for the new user
 * @param password - The plain text password to be hashed and stored
 * @returns Promise resolving to the result of the insert operation
 */
export async function createUser(email: string, password: string) {
  // Generate a salt for password hashing
  let salt = genSaltSync(10);
  // Hash the password with the generated salt
  let hash = hashSync(password, salt);

  // Insert the new user with email and hashed password
  return await db.insert(user).values({ email, password: hash });
}

/**
 * Creates or updates a chat message in the database
 * @param id - Unique identifier for the chat
 * @param messages - The message content to store
 * @param author - The email of the user who created the message
 * @returns Promise resolving to the result of the database operation
 */
export async function createMessage({
  id,
  messages,
  author,
}: {
  id: string;
  messages: any;
  author: string;
}) {
  // Check if a chat with this ID already exists
  const selectedChats = await db.select().from(chat).where(eq(chat.id, id));

  if (selectedChats.length > 0) {
    // Update existing chat with new messages
    return await db
      .update(chat)
      .set({
        messages: JSON.stringify(messages),
      })
      .where(eq(chat.id, id));
  }

  // Create a new chat entry if none exists
  return await db.insert(chat).values({
    id,
    createdAt: new Date(),
    messages: JSON.stringify(messages),
    author,
  });
}

/**
 * Retrieves all chats for a specific user, ordered by creation date (newest first)
 * @param email - The email of the user whose chats to retrieve
 * @returns Promise resolving to an array of chat records
 */
export async function getChatsByUser({ email }: { email: string }) {
  return await db
    .select()
    .from(chat)
    .where(eq(chat.author, email))
    .orderBy(desc(chat.createdAt));
}

/**
 * Retrieves a specific chat by its ID
 * @param id - The unique identifier of the chat to retrieve
 * @returns Promise resolving to the chat record
 */
export async function getChatById({ id }: { id: string }) {
  const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
  return selectedChat;
}

/**
 * Inserts document chunks with their embeddings into the database
 * Used for storing processed document fragments for retrieval-augmented generation
 * @param chunks - Array of document chunks with embeddings
 * @returns Promise resolving to the result of the insert operation
 */
export async function insertChunks({ chunks }: { chunks: any[] }) {
  return await db.insert(chunk).values(chunks);
}

/**
 * Retrieves document chunks by their file paths
 * Used for retrieving relevant document fragments during chat
 * @param filePaths - Array of file paths to retrieve chunks for
 * @returns Promise resolving to an array of chunk records
 */
export async function getChunksByFilePaths({
  filePaths,
}: {
  filePaths: Array<string>;
}) {
  return await db
    .select()
    .from(chunk)
    .where(inArray(chunk.filePath, filePaths));
}

/**
 * Deletes all chunks associated with a specific file path
 * Used when removing a document from the system
 * @param filePath - The file path whose chunks should be deleted
 * @returns Promise resolving to the result of the delete operation
 */
export async function deleteChunksByFilePath({
  filePath,
}: {
  filePath: string;
}) {
  return await db.delete(chunk).where(eq(chunk.filePath, filePath));
}

/**
 * Stores Pinecone vector IDs associated with a file path
 * @param filePath - The file path
 * @param ids - Array of Pinecone vector IDs
 * @returns Promise resolving to the result of the insert operation
 */
export async function storePineconeIds({ 
  filePath, 
  ids 
}: { 
  filePath: string; 
  ids: string[] 
}) {
  return await db.insert(pineconeIds).values({
    filePath,
    vectorIds: JSON.stringify(ids),
    createdAt: new Date()
  });
}

/**
 * Retrieves Pinecone vector IDs for a specific file path
 * @param filePath - The file path to get IDs for
 * @returns Promise resolving to an array of vector IDs
 */
export async function getPineconeIdsByFilePath({ 
  filePath 
}: { 
  filePath: string 
}) {
  const result = await db
    .select()
    .from(pineconeIds)
    .where(eq(pineconeIds.filePath, filePath));
  
  if (result.length > 0) {
    return JSON.parse(result[0].vectorIds as string) as string[];
  }
  
  return [];
}

/**
 * Deletes Pinecone ID records for a specific file path
 * @param filePath - The file path whose records should be deleted
 * @returns Promise resolving to the result of the delete operation
 */
export async function deletePineconeIdsByFilePath({
  filePath,
}: {
  filePath: string;
}) {
  return await db.delete(pineconeIds).where(eq(pineconeIds.filePath, filePath));
}
