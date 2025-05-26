# Task Context: CFF-009 - Core Feature: Context Menu Implementation

**Task ID:** CFF-009
**Depends On:** CFF-008 (project-context.md creation)
**Delegated Mode:** FrontCrafter
**Estimated Complexity:** Medium

## 1. Objective

Implement the core context menu functionality for the ChromeFormFiller extension. This involves:
1.  Creating a context menu item that appears when a user right-clicks on eligible HTML input fields (`<input type="text">`, `<input type="email">`, `<input type="search">`, `<input type="tel">`, `<input type="url">`) and `<textarea>` elements on any webpage.
2.  When the context menu item is clicked, the content script should gather relevant information from the targeted field.
3.  This information should then be sent to the background script for further processing (which will eventually involve LLM interaction via Supabase).

## 2. Scope and Deliverables

*   **Background Script (`src/background/background.js`):**
    *   Implement logic to create a context menu item titled "Fill with AI".
    *   The context menu item should only be visible when the right-click target is one of the specified input types or a textarea.
    *   Implement a listener for `chrome.contextMenus.onClicked` events.
    *   When the "Fill with AI" menu item is clicked, the background script should be ready to receive a message from the content script containing the field's context. For this task, simply log the received message to the console. (Further processing will be handled in CFF-010).
*   **Content Script (`src/content/content_script.js`):**
    *   No direct context menu creation here (handled by background script).
    *   When the background script signals that our context menu item was clicked (this happens implicitly, the background script's `onClicked` listener will receive `info.editable`, `info.menuItemId`, `info.pageUrl`, `info.selectionText`, `info.srcUrl`, `info.linkUrl`, `info.frameUrl`, `info.targetElementId` if available), the content script needs to be triggered to gather more detailed context.
    *   **Revised approach for triggering content script:** The background script, upon receiving the `onClicked` event, will send a message to the content script active in the tab where the click occurred, instructing it to gather context for the `info.targetElementId` (if available and reliable) or the currently focused/active element if `targetElementId` is not robust across all scenarios.
    *   **Context Gathering:**
        *   Identify the specific HTML element that was right-clicked (or is the active/focused element if `targetElementId` is problematic).
        *   Extract the following attributes if present: `id`, `name`, `placeholder`, `aria-label`, `type`, `value` (current value).
        *   Attempt to find an associated `<label>` element (e.g., using `htmlFor` attribute matching the field's `id`, or by traversing parent/sibling DOM elements) and extract its `innerText`.
        *   Package this information into a structured object (e.g., `{ fieldId: '...', fieldName: '...', placeholder: '...', ariaLabel: '...', labelText: '...', fieldType: '...', currentValue: '...' }`).
    *   Send this structured context object to the background script using `chrome.runtime.sendMessage`.
*   **Manifest (`manifest.json`):**
    *   Ensure the `contextMenus` permission is present.
    *   Ensure `activeTab` and `scripting` permissions are present.
    *   Verify content script and background script declarations are correct.

## 3. Acceptance Criteria

*   Right-clicking on a standard text input field shows the "Fill with AI" context menu item.
*   Right-clicking on a textarea shows the "Fill with AI" context menu item.
*   Right-clicking on non-eligible elements (e.g., a `<div>`, an image) does NOT show the "Fill with AI" context menu item.
*   Clicking the "Fill with AI" menu item results in the content script gathering context from the targeted field.
*   The gathered context (as a structured object) is successfully sent from the content script to the background script.
*   The background script logs the received context object to its console.
*   No errors are present in the extension's console related to context menu creation or event handling.

## 4. Key Context Files to Read

*   **MUST READ:** [`docs/project-management/project-context.md`](docs/project-management/project-context.md) (especially sections on architecture, components, and `manifest.json`)
*   **MUST READ:** [`docs/architecture/architectural-vision-CFF-MVP.md`](docs/architecture/architectural-vision-CFF-MVP.md) (for details on Content Script and Background Script responsibilities and interactions)
*   **MUST READ:** [`docs/project-management/task-context-new-project-ChromeFormFiller.md`](docs/project-management/task-context-new-project-ChromeFormFiller.md) (for FR1, FR3.1, FR3.2)
*   Review existing placeholder files: [`src/background/background.js`](src/background/background.js:1) and [`src/content/content_script.js`](src/content/content_script.js:1).
*   Review existing [`manifest.json`](manifest.json:1).

## 5. Interaction Mode

*   YOLO MVP (as per [`docs/project-management/workflow-state.md`](docs/project-management/workflow-state.md:7))

## 6. Notes

*   Focus on robustly identifying the target element and gathering its associated metadata.
*   The actual LLM call and response handling are out of scope for this task (will be CFF-010 and CFF-011).
*   Error handling for this task should focus on the context menu creation and message passing.
*   Ensure the solution adheres to Manifest V3 requirements.
*   The `info.targetElementId` provided by `chrome.contextMenus.onClicked` might not always be available or reliable for all types of input elements or complex web pages. The content script might need a fallback to identify the active/focused element if `targetElementId` is missing or doesn't resolve. However, for MVP, prioritize using `targetElementId` if it's consistently provided for the specified input types.