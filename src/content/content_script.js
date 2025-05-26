// src/content/content_script.js
console.log("Content script loaded for ChromeFormFiller.");

// Eligible HTML element types for the context menu
const ELIGIBLE_ELEMENT_TAGS = ["INPUT", "TEXTAREA"];
const ELIGIBLE_INPUT_TYPES = ["text", "email", "search", "tel", "url", "password", "number"];

// Stores the ID of the last element targeted for filling.
// This assumes one fill operation at a time, which is suitable for MVP.
let lastTargetElementIdForFilling;

/**
 * Finds an associated label for a given form field element.
 * @param {HTMLElement} element The form field element.
 * @returns {string | null} The text content of the label, or null if not found.
 */
function findAssociatedLabelText(element) {
  if (!element) return null;

  // 1. Check for a label associated via `for` attribute
  if (element.id) {
    const labelFor = document.querySelector(`label[for="${element.id}"]`);
    if (labelFor) return labelFor.innerText.trim();
  }

  // 2. Check for a label that is a direct parent
  if (element.parentElement && element.parentElement.tagName === 'LABEL') {
    // Get text content, excluding the input itself
    const clonedParent = element.parentElement.cloneNode(true);
    const inputClone = clonedParent.querySelector(`#${element.id}`) || clonedParent.querySelector(`[name="${element.name}"]`);
    if (inputClone) inputClone.remove();
    return clonedParent.innerText.trim();
  }

  // 3. Check for a label that is a sibling (less common for well-structured forms)
  // This can be complex and error-prone, so keeping it simple for MVP.
  // Check previous sibling
  let prevSibling = element.previousElementSibling;
  if (prevSibling && prevSibling.tagName === 'LABEL') {
    return prevSibling.innerText.trim();
  }
  // Check next sibling (if input is wrapped by label, this won't be it)
  // let nextSibling = element.nextElementSibling;
  // if (nextSibling && nextSibling.tagName === 'LABEL') {
  //   return nextSibling.innerText.trim();
  // }

  // 4. Check for aria-labelledby
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelElement = document.getElementById(ariaLabelledBy);
    if (labelElement) return labelElement.innerText.trim();
  }

  // 5. Check for aria-describedby (might contain useful context, though not strictly a label)
  // For MVP, focusing on direct labels.

  return null;
}

/**
 * Gathers context from the target form field.
 * @param {string} targetElementId The ID of the target element from the context menu click.
 * @returns {object | null} A structured context object, or null if the element is not found or not eligible.
 */
function gatherFieldContextById(targetElementId) {
  if (!targetElementId) {
    console.warn("gatherFieldContextById called without targetElementId.");
    return null;
  }

  const element = document.getElementById(targetElementId);

  if (!element) {
    console.warn(`Element with ID '${targetElementId}' not found.`);
    return null;
  }

  const tagName = element.tagName.toUpperCase();
  const fieldType = tagName === 'INPUT' ? element.type.toLowerCase() : 'textarea';

  // Validate if the element is eligible based on tag and type
  if (!ELIGIBLE_ELEMENT_TAGS.includes(tagName) || (tagName === 'INPUT' && !ELIGIBLE_INPUT_TYPES.includes(fieldType))) {
    console.log(`Element ${targetElementId} (${tagName}, type ${fieldType}) is not an eligible field for AI filling.`);
    return null; // Not an eligible field
  }

  const fieldId = element.id || null;
  const fieldName = element.name || null;
  const placeholder = element.placeholder || null;
  const ariaLabel = element.getAttribute('aria-label') || null;
  const currentValue = element.value || null;
  const labelText = findAssociatedLabelText(element);

  return {
    fieldId,
    fieldName,
    placeholder,
    ariaLabel,
    labelText,
    fieldType,
    currentValue,
    sourceElementId: targetElementId // Keep track of the original ID
  };
}


/**
 * Listener for messages from the background script.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);

  if (message.action === "gatherFieldContext") {
    if (!message.targetElementId) {
      console.error("gatherFieldContext action received without targetElementId.");
      sendResponse({ success: false, error: "targetElementId not provided to content script." });
      return true; // Keep channel open for async response
    }
    // Store the target element ID for when the LLM response comes back.
    lastTargetElementIdForFilling = message.targetElementId;
    console.log(`Content script attempting to gather context for element ID: ${lastTargetElementIdForFilling}`);

    const context = gatherFieldContextById(lastTargetElementIdForFilling);

    if (context) {
      console.log("Field context gathered:", context);
      // Send the gathered context back to the background script
      chrome.runtime.sendMessage({ action: "sendFieldContext", context: context }, (bgResponse) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending context to background:", chrome.runtime.lastError.message);
          sendResponse({ success: false, error: `Failed to send context to background: ${chrome.runtime.lastError.message}` });
        } else if (bgResponse && bgResponse.success) {
          console.log("Background script acknowledged receipt of context.");
          sendResponse({ success: true, message: "Context sent to background." });
        } else {
          console.warn("Background script did not acknowledge context or reported an error:", bgResponse);
          sendResponse({ success: false, error: (bgResponse && bgResponse.error) || "Background script did not acknowledge context." });
        }
      });
    } else {
      const errorMsg = `Could not gather context for element ID: ${lastTargetElementIdForFilling}. Element might not be eligible or found.`;
      console.warn(errorMsg);
      sendResponse({ success: false, error: errorMsg });
      lastTargetElementIdForFilling = null; // Clear if context gathering failed
    }
    return true; // Indicates that the response will be sent asynchronously.

  } else if (message.type === 'LLM_RESPONSE') {
    console.log("LLM_RESPONSE received", message);
    if (!lastTargetElementIdForFilling) {
      console.error("LLM_RESPONSE received but no targetElementId was stored.");
      return;
    }
    const targetElement = document.getElementById(lastTargetElementIdForFilling);
    if (targetElement) {
      if (typeof message.text === 'string') {
        targetElement.value = message.text;
        // Dispatch events to ensure frameworks recognize the change
        targetElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        targetElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        console.log(`Field ${lastTargetElementIdForFilling} updated with LLM response.`);
      } else {
        console.error("LLM_RESPONSE did not contain valid text.", message);
      }
    } else {
      console.error(`Target element with ID '${lastTargetElementIdForFilling}' not found for LLM_RESPONSE.`);
    }
    lastTargetElementIdForFilling = null; // Clear after processing

  } else if (message.type === 'LLM_ERROR') {
    console.error("ChromeFormFiller - LLM Error:", message.message);
    if (lastTargetElementIdForFilling) {
      console.error(`Error was for target element ID: ${lastTargetElementIdForFilling}`);
    }
    lastTargetElementIdForFilling = null; // Clear after processing

  } else if (message.type === 'AUTH_REQUIRED') {
    console.warn("ChromeFormFiller - Authentication Required:", message.message);
    // Optionally, display a more user-friendly notification in the future.
    lastTargetElementIdForFilling = null; // Clear if auth is required mid-flow
  }
  // Note: For LLM_RESPONSE, LLM_ERROR, AUTH_REQUIRED, we don't call sendResponse
  // as they are typically one-way notifications from the background script.
  // Returning true is only necessary if sendResponse is called asynchronously.
});

// Log to confirm content script is running on the page
console.log("ChromeFormFiller content script initialized and listening for messages.");