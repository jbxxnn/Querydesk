import { customModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import { createMessage } from "@/app/db";
import { streamText, tool } from "ai";
import { updateResource } from '@/lib/actions/resources';
import { z } from "zod";
import { findRelevantContent } from "@/lib/ai/embedding";

/**
 * POST handler for the chat API endpoint
 * Processes incoming chat messages and returns AI responses as a stream
 */
export async function POST(request: Request) {
  // Parse the request body to extract chat ID, message history, and selected files
  const { id, messages, selectedFilePathnames } = await request.json();

  // Verify user authentication
  const session = await auth();

  // Return 401 if user is not authenticated
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check if the user has admin role
  const isAdmin = session.user?.role === "admin";

  // Initialize streaming response using the AI SDK
  const result = streamText({
    // Use the custom model defined in the AI configuration
    model: customModel,
    // Define the system prompt that sets the assistant's behavior and capabilities
    system:
      `you are a friendly assistant! keep your responses concise and helpful.
      
      1. For general questions about code or files, I'll automatically provide relevant context.
      
      2. For specific information retrieval needs, use the getInformation tool.
      
      3. IMPORTANT: When a user asks to update, change, modify, or edit any information:
        ${isAdmin ? `
        - First use getInformation to find the exact content to update
        - BEFORE making any changes, show the user:
          * The exact content that will be updated (copy and paste the exact text)
          * The proposed new content (copy and paste the exact text with changes)
          * Ask for explicit confirmation to proceed with "Do you want me to update this information?"
        - ONLY after receiving confirmation, use updateInformation tool with:
          * searchQuery: The EXACT existing text that needs to be updated (copy the full line or paragraph)
          * newContent: The EXACT new text to replace it with (the full line or paragraph with changes)
          * context: (Optional) Some surrounding text to ensure accurate matching
        - If the update is successful (success: true in response), inform the user
        - Do not verify again unless the user specifically asks
        ` : `
        - Politely inform the user that only administrators can make updates to the knowledge base
        - Offer to show them the information they're interested in using the getInformation tool
        - Suggest they contact an administrator if they need to make changes
        `}
        
      4. EXAMPLES of update requests:
        - "Update the morning shift to start at 9:00 AM"
        - "Change Team A's hours to 9-5"
        - "Modify the schedule for morning shift"
        - "Edit the morning shift time"`,
    // Pass the message history from the client
    messages,
    // Provide metadata about selected files for context
    experimental_providerMetadata: {
      files: {
        selection: selectedFilePathnames,
      },
    },
    // Limit the number of reasoning steps the model can take
    maxSteps: 10,
    // Define custom tools that the AI can use to interact with the application
    tools: {
      // Tool for retrieving information from the knowledge base
      getInformation: tool({
        description: `Search the knowledge base for specific information. Use this tool when you need to find exact content for updates.`,
        // Define the expected parameters using zod schema
        parameters: z.object({
          question: z.string().describe('the users question'),
        }),
        // Implementation of the tool functionality
        execute: async ({ question }) => {
          console.log('getInformation tool called with:', question);
          // Search the knowledge base using semantic search
          const result = await findRelevantContent(question);
          console.log('Knowledge base search result:', result);
          return result;
        },
      }),
      // Tool for updating information in the knowledge base
      updateInformation: tool({
        description: `Update existing information in the knowledge base when content changes.`,
        // Define the expected parameters using zod schema
        parameters: z.object({
          searchQuery: z.string().describe('The old content to find and update'),
          newContent: z.string().describe('The new content to replace it with'),
          context: z.string().optional().describe('Surrounding text to ensure correct match'),
        }),
        // Implementation of the tool functionality
        execute: async ({ searchQuery, newContent, context }) => {
          console.log('updateInformation tool called with:', { searchQuery, newContent, context });
          
          // Check if user has admin role before allowing updates
          if (!isAdmin) {
            return {
              success: false,
              message: 'Permission denied: Only administrators can update information',
              error: true
            };
          }
          
          try {
            // Attempt to update the resource in the knowledge base
            const result = await updateResource({ searchQuery, newContent, context });
            console.log('Update result:', result);
            return result;
          } catch (error) {
            // Handle and log any errors during the update process
            console.error('Error in updateInformation tool:', error);
            return {
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error occurred during update',
              error: true
            };
          }
        },
      }),
    },
    // Callback function executed when the AI response is complete
    onFinish: async ({ text }) => {
      // Save the completed conversation to the database
      await createMessage({
        id,
        messages: [...messages, { role: "assistant", content: text }],
        author: session.user?.email!,
      });
    },
    // Enable telemetry for monitoring and analytics
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  // Return the streaming response to the client
  return result.toDataStreamResponse({});
}
