import { base44 } from "@/api/base44Client";

/**
 * Extract text content from a message object, handling various formats
 */
function extractMessageContent(message) {
  if (!message) return "";

  // 1) String content
  if (typeof message.content === "string" && message.content.trim()) {
    return message.content.trim();
  }

  // 2) Object/JSON content (very common for Base44 expert agents)
  if (message.content && typeof message.content === "object") {
    const maybe =
      (typeof message.content.response === "string" && message.content.response) ||
      (typeof message.content.advice === "string" && message.content.advice) ||
      (typeof message.content.text === "string" && message.content.text) ||
      (typeof message.content.message === "string" && message.content.message);

    if (maybe && maybe.trim()) return maybe.trim();

    // Fallback: stringify so we can still resolve and render something
    try {
      return JSON.stringify(message.content);
    } catch {
      return String(message.content);
    }
  }

  // 3) message.text
  if (typeof message.text === "string" && message.text.trim()) {
    return message.text.trim();
  }

  // 4) parts[]
  if (Array.isArray(message.parts)) {
    const text = message.parts
      .filter((p) => p && typeof p.text === "string")
      .map((p) => p.text)
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
export async function waitForAssistantMessage(conversationId, timeoutMs = 180000, options = {}) {
    const { debug = true, context = "agent" } = options;
  
  const startTime = Date.now();
  
  if (debug) {
    console.log(`[AgentWait:${context}] Starting wait for conversation:`, {
      conversationId,
      timeout: `${timeoutMs}ms`,
      timestamp: new Date().toISOString()
    });
  }
  
  // Check current conversation snapshot first (prevents missed events)
  try {
    const snapshot = await base44.agents.getConversation(conversationId);
    const messages = snapshot?.messages || [];
    
    if (debug) {
      console.log(`[AgentWait:${context}] Snapshot check:`, {
        total_messages: messages.length,
        last_3_roles: messages.slice(-3).map(m => m.role)
      });
    }
    
    // Look for existing assistant message
    const assistant = [...messages]
      .reverse()
      .find((m) => {
        if (!m.role || !["assistant", "agent"].includes(m.role)) return false;
        if (m.type === "tool" || m.type === "system") return false;
        const content = extractMessageContent(m);
        return content.length > 0;
      });
    
    if (assistant) {
      const content = extractMessageContent(assistant);
      if (debug) {
        console.log(`[AgentWait:${context}] ✅ Found in snapshot (${Date.now() - startTime}ms):`, {
          content_length: content.length,
          preview: content.substring(0, 150)
        });
      }
      return content;
    }
  } catch (err) {
    if (debug) {
      console.warn(`[AgentWait:${context}] Snapshot check failed (non-fatal):`, err);
    }
  }
  
  return new Promise((resolve, reject) => {
    let resolved = false;
    let eventCount = 0;
    let lastContent = '';
    let quietWindowTimeout = null;
    const QUIET_WINDOW_MS = 1200;

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
                error: msg.error
              });
            }
            if (!resolved) {
              resolved = true;
              try { unsubscribe?.(); } catch {}
              clearTimeout(quietWindowTimeout);
              reject(new Error(`Agent error: ${errorMsg}`));
            }
            return;
          }
        }
        
        // Collect ALL assistant messages (handle chunked responses)
        let assistantContent = '';
        for (const msg of messages) {
          if (msg.role === 'assistant' || msg.role === 'agent') {
            const content = extractMessageContent(msg);
            if (content) assistantContent += content;
          }
        }

        // Get latest assistant message for status check
        const latestAssistant = [...messages]
          .reverse()
          .find((m) => {
            if (!m.role || !["assistant", "agent"].includes(m.role)) return false;
            if (m.type === "tool" || m.type === "system") return false;
            return true;
          });

        if (assistantContent && !resolved) {
          if (debug) {
            console.log(`[AgentWait:${context}] Content update:`, {
              length: assistantContent.length,
              status: latestAssistant?.status,
              changed: assistantContent !== lastContent
            });
          }

          // Clear previous quiet window timeout
          clearTimeout(quietWindowTimeout);

          // Check if assistant message is marked as complete
          const isComplete = latestAssistant?.status && 
            ["completed", "done", "final"].includes(latestAssistant.status.toLowerCase());

          if (isComplete) {
            if (debug) {
              console.log(`[AgentWait:${context}] ✅ Agent marked complete (${elapsed}ms)`, {
                status: latestAssistant.status,
                content_length: assistantContent.length
              });
            }
            resolved = true;
            try { unsubscribe?.(); } catch {}
            resolve(assistantContent);
            return;
          }

          // If content hasn't changed, start quiet window
          if (assistantContent === lastContent && assistantContent.length > 0) {
            if (debug) {
              console.log(`[AgentWait:${context}] No new content, starting quiet window (${QUIET_WINDOW_MS}ms)`);
            }

            quietWindowTimeout = setTimeout(() => {
              if (!resolved) {
                resolved = true;
                try { unsubscribe?.(); } catch {}
                if (debug) {
                  console.log(`[AgentWait:${context}] ✅ Quiet window complete (${elapsed}ms)`, {
                    content_length: assistantContent.length,
                    total_events: eventCount
                  });
                }
                resolve(assistantContent);
              }
            }, QUIET_WINDOW_MS);
          } else {
            // Content changed, update tracker
            lastContent = assistantContent;
            if (debug) {
              console.log(`[AgentWait:${context}] Content growing: ${assistantContent.length} chars`);
            }
          }
        }
      }
    );

    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      try { unsubscribe?.(); } catch {}
      clearTimeout(quietWindowTimeout);
      
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