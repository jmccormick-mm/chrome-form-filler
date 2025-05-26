// src/background/background.js
import { supabase } from '../core/supabaseClient.js';

// Context menu item ID
const CONTEXT_MENU_ID = "fillWithAI";

// Eligible HTML element types for the context menu
const ELIGIBLE_ELEMENTS = ["INPUT", "TEXTAREA"];
const ELIGIBLE_INPUT_TYPES = ["text", "email", "search", "tel", "url", "password", "number"]; // Added password and number as per common form fields, can be refined.

/**
 * Creates the context menu item.
 */
function createContextMenu() {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Fill with AI",
    contexts: ["editable"], // Show for any editable element initially
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error creating context menu:", chrome.runtime.lastError.message);
    } else {
      console.log("Context menu 'Fill with AI' created successfully.");
    }
  });
}

/**
 * Handles the initial setup when the extension is installed or updated.
 * Removes any existing context menus to prevent duplicates and then creates it.
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log("ChromeFormFiller extension installed/updated.");
  // Remove existing context menu items to prevent duplicates during development/reloads
  chrome.contextMenus.removeAll(() => {
    createContextMenu();
  });
});

/**
 * Listener for context menu item clicks.
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID && tab && tab.id) {
    console.log("Context menu 'Fill with AI' clicked.", info);

    // Check if the target element is one of the specified input types or a textarea
    // This check is a bit more involved as `info.editable` is broad.
    // We'll send a message to content script to verify element type and gather context.
    // The `info.targetElementId` is available in Manifest V3 for context menu items
    // created by the extension.

    if (info.targetElementId !== undefined && info.targetElementId !== null) {
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: "gatherFieldContext",
          targetElementId: info.targetElementId,
          frameId: info.frameId // Pass frameId for elements within iframes
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message to content script or content script did not respond:", chrome.runtime.lastError.message);
          } else if (response && response.error) {
            console.error("Content script reported an error:", response.error);
          } else if (response && response.success) {
            console.log("Context gathering initiated by content script for element:", info.targetElementId);
          } else {
            console.warn("Received an unexpected or no response from content script for gatherFieldContext action.");
          }
        }
      );
    } else {
      console.warn("Context menu clicked, but targetElementId is not available. Cannot proceed with context gathering.");
      // Optionally, could try to get the active element as a fallback, but `targetElementId` is preferred.
      // For MVP, we rely on targetElementId.
    }
  }
});

/**
 * Listener for messages from content scripts.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sendFieldContext") {
    if (!message.context) {
      console.error("Received sendFieldContext message without context object.");
      sendResponse({ success: false, error: "No context object provided." });
      return true; // Keep true for async response
    }

    console.log("Received field context from content script:", message.context, "from sender:", sender);
    const { context: fieldContext } = message;
    const originalTabId = sender.tab ? sender.tab.id : null;
    const originalFrameId = sender.frameId;


    // Asynchronously call the Edge Function
    (async () => {
      try {
        // 1. Check authentication state (MVP: assume session exists if getSession() is successful)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Error getting Supabase session:", sessionError.message);
          if (originalTabId !== null) {
            chrome.tabs.sendMessage(originalTabId, { type: 'LLM_ERROR', message: `Error getting session: ${sessionError.message}` }, { frameId: originalFrameId });
          }
          return;
        }

        if (!session) {
          console.warn("User not authenticated with Supabase. Prompting login.");
          // Inform content script that authentication is required.
          if (originalTabId !== null) {
            chrome.tabs.sendMessage(originalTabId, { type: 'AUTH_REQUIRED', message: 'Please log in via the extension options page to use AI features.' }, { frameId: originalFrameId });
          }
          return;
        }

        // User is authenticated, proceed to call the Edge Function
        console.log("User authenticated, invoking llm-proxy function...");

        const { data, error: invokeError } = await supabase.functions.invoke('llm-proxy', {
          body: { fieldContext },
          // Supabase client handles Authorization header with JWT automatically if session exists.
          // Supabase client also handles apikey header.
        });

        if (invokeError) {
          console.error('Error invoking llm-proxy Edge Function:', invokeError.message);
          if (originalTabId !== null) {
            chrome.tabs.sendMessage(originalTabId, { type: 'LLM_ERROR', message: `Edge function error: ${invokeError.message}` }, { frameId: originalFrameId });
          }
          return;
        }

        console.log('llm-proxy Edge Function response:', data);

        if (data.success) {
          console.log("LLM generated text:", data.generatedText);
          // Send the generated text back to the content script that made the original request
          if (originalTabId !== null) {
            chrome.tabs.sendMessage(originalTabId, { type: 'LLM_RESPONSE', text: data.generatedText }, { frameId: originalFrameId });
          }
        } else {
          console.error("LLM proxy function reported an error:", data.error);
          if (originalTabId !== null) {
            chrome.tabs.sendMessage(originalTabId, { type: 'LLM_ERROR', message: data.error || "Unknown error from LLM proxy." }, { frameId: originalFrameId });
          }
        }
      } catch (e) {
        console.error("Unexpected error calling llm-proxy or handling response:", e);
        if (originalTabId !== null) {
          chrome.tabs.sendMessage(originalTabId, { type: 'LLM_ERROR', message: `Unexpected error: ${e.message}` }, { frameId: originalFrameId });
        }
      }
    })();

    // sendResponse({ success: true, message: "Processing LLM request..." }); // Acknowledge receipt if needed, but actual response is async
    return true; // Crucial for asynchronous response via chrome.tabs.sendMessage
  }
});

// Log to confirm background script is running
console.log("Background script loaded and running.");