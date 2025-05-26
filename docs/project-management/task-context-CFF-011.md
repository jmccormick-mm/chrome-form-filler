# Task Context: CFF-011 - Core Feature: Prompt & Response Handling

**Overall Project:** ChromeFormFiller (Chrome Extension)
**Parent Task:** CFF-010 (Core Feature: LLM API Integration - Completed)
**Current Task:** CFF-011 - Core Feature: Prompt & Response Handling in Content Script

## 1. Objective
Modify the content script (`src/content/content_script.js`) to handle the response (either successful LLM-generated text or an error message) received from the background script (`src/background/background.js`) after the `llm-proxy` Supabase Edge Function has been called. If successful, the content script should fill the originally targeted form field with the received text.

## 2. Scope and Requirements

### 2.A. Modifying `src/content/content_script.js`
*   **Listen for Response from Background Script:**
    *   The background script, after calling the `llm-proxy` function, will send a message back to the content script associated with the active tab. This message should contain the outcome of the LLM call.
    *   The message format from `background.js` is expected to be an object, for example:
        *   Success: `{ type: "LLM_RESPONSE", success: true, generatedText: "...", targetElementSelector: "css_selector_for_field" }`
        *   Error: `{ type: "LLM_RESPONSE", success: false, error: "Error message here", targetElementSelector: "css_selector_for_field" }`
    *   The `targetElementSelector` is crucial for identifying which form field to update. This selector should have been determined and stored by the content script when it initially received the request from the background script to gather field context (as part of CFF-009).
*   **Handle Successful Response:**
    *   If `success` is `true` and `generatedText` is present:
        *   Locate the target form field using the `targetElementSelector` (or the stored reference to the element).
        *   Set the `value` property of the form field to `generatedText`.
        *   Consider dispatching `input` and `change` events on the element after setting its value to ensure any JavaScript event listeners on the page react to the change (important for some web applications).
        ```javascript
        // Example:
        // const field = document.querySelector(targetElementSelector);
        // if (field) {
        //   field.value = generatedText;
        //   field.dispatchEvent(new Event('input', { bubbles: true }));
        //   field.dispatchEvent(new Event('change', { bubbles: true }));
        // }
        ```
*   **Handle Error Response:**
    *   If `success` is `false` and an `error` message is present:
        *   For MVP, log the error message to the browser's developer console.
        *   Example: `console.error("ChromeFormFiller - LLM Error:", errorMsg);`
*   **Maintain Context:**
    *   The content script needs to remember which element was originally right-clicked so it can fill the correct field when the LLM response arrives. This might involve storing a reference to the element or its unique selector when the `GET_FIELD_CONTEXT` message is processed.

### 2.B. Communication Flow (Recap)
1.  **User:** Right-clicks on a form field -> Clicks "Fill with AI".
2.  **`background.js` (CFF-009):** Context menu click handler sends `GET_FIELD_CONTEXT` message to `content_script.js` (passing `tab.id` and `info.editable` and `info.frameId` if needed).
3.  **`content_script.js` (CFF-009):**
    *   Receives `GET_FIELD_CONTEXT`.
    *   Identifies the `activeElement` (the right-clicked field).
    *   **Crucially, stores a reference to this `activeElement` or a unique CSS selector for it.**
    *   Gathers context (`id`, `name`, `placeholder`, `aria-label`, surrounding text, etc.).
    *   Sends `FIELD_CONTEXT_RESULT` message back to `background.js` with the gathered context.
4.  **`background.js` (CFF-010.B):**
    *   Receives `FIELD_CONTEXT_RESULT`.
    *   Calls `llm-proxy` Supabase Edge Function with the field context.
    *   Receives response from Edge Function.
    *   Sends `LLM_RESPONSE` message (containing `generatedText` or `error`, and `success` status) back to the `content_script.js` of the original tab, **including the `targetElementSelector` or enough info for the content script to identify the target.**
5.  **`content_script.js` (CFF-011 - This Task):**
    *   Receives `LLM_RESPONSE`.
    *   Uses the stored reference/selector to find the target field.
    *   If successful, updates the field's value with `generatedText`.
    *   If error, logs the error.

## 3. Deliverables
*   Updated `src/content/content_script.js` implementing the response handling logic.
*   Confirmation that the content script can now receive responses from the background script and appropriately update the target form field or log errors.

## 4. Key Considerations
*   **Element Reference/Selector:** The mechanism for `content_script.js` to remember the target element between receiving `GET_FIELD_CONTEXT` and `LLM_RESPONSE` needs to be robust. If the DOM changes, a stored direct element reference might become stale. A unique CSS selector might be more reliable.
*   **Event Dispatching:** Dispatching `input` and `change` events is good practice for compatibility with various web frameworks.
*   **Error Display (Future):** For MVP, console logging errors is fine. Future enhancements could involve displaying user-friendly error notifications.
*   **Security:** Ensure that messages are handled only from the extension itself (e.g., check `sender.id`). Chrome's `chrome.runtime.onMessage` automatically provides some protection by only allowing messages from the same extension by default unless `externally_connectable` is specified in the manifest.

## 5. Dependencies
*   **CFF-010:** Core Feature: LLM API Integration (Completed). `background.js` is now capable of calling the LLM and sending a response message.
*   [`src/background/background.js`](src/background/background.js:1) (as modified in CFF-010.B)
*   [`src/content/content_script.js`](src/content/content_script.js:1) (as modified in CFF-009)