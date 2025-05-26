# ChromeFormFiller MVP - UI/UX Design & System

**Task ID:** CFF-005
**Author:** Artisan Mode
**Date:** 2025-05-26
**Version:** 0.1.0
**Interaction Mode:** YOLO MVP

## 1. Overview

This document outlines the minimal UI/UX design for the ChromeFormFiller MVP. The design prioritizes simplicity, core functionality, and ease of use, leveraging native browser/extension capabilities as much as possible. The primary interaction is through a context menu item, with a basic options page for API key configuration and simple notifications for feedback.

## 2. User Flows

### 2.1. Flow 1: Activating Extension & Getting a Response (Happy Path)

```mermaid
graph TD
    A[User right-clicks on an eligible input field/textarea] --> B{Context menu appears};
    B --> C{User clicks "Fill with AI"};
    C --> D[Content script gathers field context];
    D --> E[Background script receives context, retrieves API key];
    E --> F[Background script calls OpenAI API];
    F --> G{LLM generates response};
    G --> H[Background script sends response to content script];
    H --> I[Content script attempts to auto-fill the field];
    I --> J[Content script shows temporary notification: "AI response generated." with "Copy" button];
    J --> K[User can click "Copy" or interact with the auto-filled field];
```

### 2.2. Flow 2: Setting the API Key

```mermaid
graph TD
    A[User clicks extension icon in Chrome toolbar OR is prompted by a notification] --> B{Extension options page opens};
    B --> C[User sees an input field for "OpenAI API Key" and a "Save" button];
    C --> D{User enters their API key};
    D --> E{User clicks "Save"};
    E --> F[API key is saved to `chrome.storage.local`];
    F --> G[Options page shows "API Key Saved!" confirmation];
```

### 2.3. Flow 3: API Key Not Set

```mermaid
graph TD
    A[User right-clicks on an eligible input field/textarea] --> B{Context menu appears};
    B --> C{User clicks "Fill with AI"};
    C --> D[Content script gathers field context];
    D --> E[Background script receives context, attempts to retrieve API key];
    E --> F{API key not found in `chrome.storage.local`};
    F --> G[Background script sends "API Key Missing" message to content script];
    G --> H[Content script shows notification: "API Key missing. Please set it in options." with "Open Options" button];
    H --> I{User clicks "Open Options"};
    I --> J[Extension options page opens (Flow 2)];
```
*(Alternative for FR2.5: Context menu item could be disabled or show a sub-item "Set API Key" if key is missing. For MVP, a notification post-click is simpler.)*

### 2.4. Flow 4: LLM API Error

```mermaid
graph TD
    A[User right-clicks on an eligible input field/textarea] --> B{Context menu appears};
    B --> C{User clicks "Fill with AI"};
    C --> D[...API call initiated...];
    D --> E{LLM API returns an error (e.g., invalid key, network issue)};
    E --> F[Background script sends error message to content script];
    F --> G[Content script shows notification: "Error: [Specific error message, e.g., Invalid API Key]." with "Dismiss" button];
```

## 3. UI Elements & Mockups (Minimalist MVP)

### 3.1. Context Menu Item

*   **Text/Label:** "Fill with AI"
    *   **Rationale:** Clear, concise, and action-oriented.
*   **Icon:** None for MVP (relies on default Chrome context menu styling).
*   **Behavior:** Appears when right-clicking on `<input type="text|email|search|tel|url">` or `<textarea>`.

### 3.2. Options Page (`options.html`)

*   **Purpose:** Allow users to input and save their OpenAI API key.
*   **Layout:** Extremely basic, single-column.
*   **Elements:**
    *   Page Title: `<h1>ChromeFormFiller Options</h1>`
    *   Section Title: `<h2>API Key Configuration</h2>`
    *   Instructional Text: `<p>Please enter your OpenAI API Key:</p>`
    *   Input Field: `<input type="password" id="apiKeyInput" placeholder="sk-...">` (type="password" to obscure key)
        *   **Styling:** Standard browser default.
    *   Save Button: `<button id="saveButton">Save API Key</button>`
        *   **Styling:** Standard browser default.
    *   Status Message Area: `<p id="statusMessage"></p>` (e.g., for "API Key Saved!", "Error saving API key.")

*   **ASCII Mockup (`options.html`):**
    ```
    +------------------------------------------+
    |         ChromeFormFiller Options         |
    +------------------------------------------+
    |                                          |
    |        API Key Configuration             |
    |                                          |
    | Please enter your OpenAI API Key:        |
    |                                          |
    | [sk-___________________________________] |  (apiKeyInput)
    |                                          |
    |              [Save API Key]              |  (saveButton)
    |                                          |
    | <API Key Saved!>                         |  (statusMessage)
    |                                          |
    +------------------------------------------+
    ```

### 3.3. Response Notification/Popup (Content Script UI)

*   **Purpose:**
    *   Inform the user that the AI response has been generated (and auto-filled if successful).
    *   Provide a "Copy" button as a fallback or primary way to use the text.
*   **Appearance:** A small, non-intrusive overlay/banner appearing near the target field or corner of the screen. Disappears automatically after a few seconds or on dismiss.
*   **Elements:**
    *   Text: "AI response generated." (or "AI response ready:")
    *   Generated Text (optional, if not too long, or a snippet): `<span>[Generated Text Snippet...]</span>`
    *   Copy Button: `<button id="copyResponseButton">Copy</button>`
    *   Dismiss (optional): `<span>(auto-dismisses in 5s)</span>` or an 'X' button.

*   **ASCII Mockup (Notification):**
    ```
    +---------------------------------------------+
    | AI response generated. [Copy] (Dismisses)   |
    +---------------------------------------------+
    ```
    *If auto-fill fails or is partial, the message could be "AI response ready: [Copy]"*

### 3.4. Error/Status Notifications (Content Script UI)

*   **Purpose:** Provide feedback for errors or required actions.
*   **Appearance:** Similar to the response notification (small overlay/banner).
*   **Examples:**
    *   **API Key Missing:**
        *   Text: "API Key missing. Please set it in options."
        *   Button: `<button id="openOptionsButton">Open Options</button>`
        *   **ASCII Mockup:**
            ```
            +----------------------------------------------------+
            | API Key missing. Please set it in options. [Open Options] |
            +----------------------------------------------------+
            ```
    *   **API Call Error:**
        *   Text: "Error: [Specific error message from API, e.g., Invalid API Key]."
        *   Button (optional): "Dismiss"
        *   **ASCII Mockup:**
            ```
            +----------------------------------------------------+
            | Error: Invalid API Key. (Dismiss)                  |
            +----------------------------------------------------+
            ```
    *   **Processing Feedback (NFR2.1):**
        *   Briefly, upon clicking "Fill with AI", a subtle indicator could appear.
        *   Text: "Processing with AI..." (could be part of the context menu item temporarily changing or a very brief notification)
        *   For MVP, this might be skipped if the response time is generally quick, to keep UI minimal. If implemented, it should be very transient.

## 4. Design Principles (MVP Focus)

*   **Minimalism:** Only essential UI elements. Leverage native browser styles and behaviors.
*   **Clarity:** User actions and feedback should be unambiguous.
*   **Ease of Use:** Core tasks (activation, API key setup, getting response) must be straightforward.
*   **Non-Intrusive:** Notifications should be temporary and easy to dismiss or ignore.
*   **Function over Form:** Prioritize getting the core functionality working over elaborate visual design for MVP.

## 5. Accessibility Considerations (MVP Focus)

*   **Context Menu:** Inherits accessibility from the browser's native context menu.
*   **Options Page:**
    *   Use semantic HTML (`<h1>`, `<label for="...">`, `<button>`).
    *   Ensure sufficient color contrast for text and UI controls (though relying on browser defaults for MVP).
    *   Keyboard navigable: Input field and button should be focusable and operable via keyboard.
*   **Notifications:**
    *   If they auto-dismiss, provide enough time for users to read.
    *   Ensure text has good contrast with the background.
    *   For MVP, advanced ARIA roles for notifications might be out of scope but should be considered for future improvements. Buttons within notifications should be keyboard focusable.
*   **Focus Management:**
    *   When "Open Options" is clicked from a notification, focus should move to the options page, ideally to the API key input field.

## 6. Next Steps

This UI/UX design document provides the minimal specifications for the ChromeFormFiller MVP. It should be used by FrontCrafter and other relevant developer modes for implementation.