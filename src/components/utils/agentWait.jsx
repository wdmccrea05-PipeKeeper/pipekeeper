import { base44 } from "@/api/base44Client";

/**
 * Wait for assistant response from an agent conversation
 * 
 * Base44 agent responses arrive asynchronously via subscribeToConversation.
 * This helper waits for the assistant message instead of trying to read it
 * synchronously from addMessage() response.
 * 
 * @param {string} conversationId - The conversation ID to subscribe to
 * @param {number} timeoutMs - Max time to wait for response (default: 45000ms)
 * @returns {Promise<string>} The assistant's response content
 * @throws {Error} If timeout is reached before assistant responds
 */
export async function waitForAssistantMessage(conversationId, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const unsubscribe = base44.agents.subscribeToConversation(
      conversationId,
      (data) => {
        const messages = data?.messages || [];
        const assistant = [...messages]
          .reverse()
          .find(
            (m) =>
              m.role === "assistant" &&
              typeof m.content === "string" &&
              m.content.trim().length > 0
          );

        if (assistant && !resolved) {
          resolved = true;
          try { unsubscribe?.(); } catch {}
          resolve(assistant.content);
        }
      }
    );

    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      try { unsubscribe?.(); } catch {}
      reject(new Error("Timed out waiting for assistant response"));
    }, timeoutMs);
  });
}