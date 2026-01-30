import { base44 } from "@/api/base44Client";

/**
 * Extract text content from a message object, handling various formats
 */
function extractMessageContent(message) {
  if (!message) return "";
  
  // Try m.content first
  if (typeof message.content === "string" && message.content.trim()) {
    return message.content.trim();
  }
  
  // Try m.text
  if (typeof message.text === "string" && message.text.trim()) {
    return message.text.trim();
  }
  
  // Try m.parts array (for multi-part messages)
  if (Array.isArray(message.parts)) {
    const text = message.parts
      .filter(p => p && typeof p.text === "string")
      .map(p => p.text)
      .join("")
      .trim();
    if (text) return text;
  }
  
  return "";
}

/**
 * Wait for assistant response from an agent conversation with comprehensive debugging
 * 
 * Base44 agent responses arrive asynchronously via subscribeToConversation.
 * This helper waits for the assistant message instead of trying to read it
 * synchronously from addMessage() response.
 * 
 * @param {string} conversationId - The conversation ID to subscribe to
 * @param {number} timeoutMs - Max time to wait for response (default: 60000ms)
 * @param {object} options - Optional configuration { debug: boolean, context: string }
 * @returns {Promise<string>} The assistant's response content
 * @throws {Error} If timeout is reached before assistant responds or if agent errors
 */
export async function waitForAssistantMessage(conversationId, timeoutMs = 60000, options = {}) {
  const { debug = true, context = "agent" } = options;
  
  const startTime = Date.now();
  
  if (debug) {
    console.log(`[AgentWait:${context}] Starting wait for conversation:`, {
      conversationId,
      timeout: `${timeoutMs}ms`,
      timestamp: new Date().toISOString()
    });
  }
  
  return new Promise((resolve, reject) => {
    let resolved = false;
    let eventCount = 0;

    const unsubscribe = base44.agents.subscribeToConversation(
      conversationId,
      (data) => {
        eventCount++;
        const elapsed = Date.now() - startTime;
        const messages = data?.messages || [];
        
        if (debug) {
          console.log(`[AgentWait:${context}] Event #${eventCount} (${elapsed}ms):`, {
            total_messages: messages.length,
            last_3_roles: messages.slice(-3).map(m => ({
              role: m.role,
              hasContent: !!m.content,
              hasText: !!m.text,
              hasParts: !!m.parts,
              status: m.status,
              error: m.error
            }))
          });
        }
        
        // Check for agent errors first
        for (const msg of messages.slice().reverse()) {
          if (msg.status === "error" || msg.error) {
            const errorMsg = msg.error?.message || msg.error || "Agent encountered an error";
            if (debug) {
              console.error(`[AgentWait:${context}] Agent error detected:`, {
                status: msg.status,
                error: msg.error,
                full_message: msg
              });
            }
            if (!resolved) {
              resolved = true;
              try { unsubscribe?.(); } catch {}
              reject(new Error(`Agent error: ${errorMsg}`));
            }
            return;
          }
        }
        
        // Look for valid assistant message (newest first)
        const assistant = [...messages]
          .reverse()
          .find((m) => {
            // Accept assistant or agent role
            if (!m.role || !["assistant", "agent"].includes(m.role)) {
              return false;
            }
            
            // Skip tool/system messages
            if (m.type === "tool" || m.type === "system") {
              return false;
            }
            
            // Extract content using flexible matcher
            const content = extractMessageContent(m);
            return content.length > 0;
          });

        if (assistant && !resolved) {
          const content = extractMessageContent(assistant);
          resolved = true;
          try { unsubscribe?.(); } catch {}
          
          if (debug) {
            console.log(`[AgentWait:${context}] ✅ Assistant response received (${elapsed}ms):`, {
              content_length: content.length,
              preview: content.substring(0, 150),
              total_events: eventCount
            });
          }
          
          resolve(content);
        }
      }
    );

    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      try { unsubscribe?.(); } catch {}
      
      const elapsed = Date.now() - startTime;
      if (debug) {
        console.error(`[AgentWait:${context}] ⏱️ Timeout after ${elapsed}ms:`, {
          total_events: eventCount,
          timeout_ms: timeoutMs
        });
      }
      
      reject(new Error(`Timed out after ${elapsed}ms (${eventCount} events received)`));
    }, timeoutMs);
  });
}