# New Project: Chrome Form Filler Extension

## Initial User Request:
I need you to help me design a simple chrome extension that allows me to right click on an input field or textarea field in a live webpage and use a LLM API key to determine what question or prompt the form field input/textarea is intended to respond to, after which it should formulate a response. If it can auto fill the response that's great, but a simple copy button for the user to paste in manually is fine too. Should eventually be able to use many sort of keys form various providers. Right now I'd like you to choose the provider that make this project the easiest to setup and get running. Should work in chrome as an extension. I don't need it to be listed in the chrome webstore right now.

## Project Name:
ChromeFormFiller

## Detailed MVP Requirements

### Functional Requirements (FR)

*   **FR1: Extension Activation**
    *   FR1.1: The extension MUST add a context menu item (e.g., "Fill with AI") when the user right-clicks on an HTML `<input>` (of types: text, email, search, tel, url) or `<textarea>` element on a webpage.
*   **FR2: API Key Management (MVP)**
    *   FR2.1: The extension MUST provide a simple options page accessible via the Chrome extensions menu.
    *   FR2.2: The options page MUST allow the user to input and save their LLM API key.
    *   FR2.3: The API key MUST be stored locally using `chrome.storage.local`.
    *   FR2.4: The extension MUST retrieve the stored API key for making LLM API calls.
    *   FR2.5: If no API key is set, the extension SHOULD inform the user (e.g., via a notification or by disabling the context menu item with a prompt to set the key in options).
*   **FR3: Input Context Identification (MVP)**
    *   FR3.1: Upon activation, the extension MUST attempt to identify the context or prompt associated with the targeted input field.
    *   FR3.2: For MVP, context identification MAY use a heuristic based on the field's `id`, `name`, `placeholder`, `aria-label` attributes, and any associated `<label>` element text. The gathered information will form the basis of the prompt for the LLM.
    *   FR3.3: The identified context/question will be sent to the LLM.
*   **FR4: LLM Response Generation (MVP)**
    *   FR4.1: The extension MUST use the user-provided API key and the identified context to make an API call to the selected LLM provider.
    *   FR4.2: The selected LLM provider for MVP is **OpenAI**. This decision is based on its widespread adoption, comprehensive documentation, and generally straightforward API integration, aligning with the user's request for ease of setup.
    *   FR4.3: The prompt sent to the LLM should instruct it to generate a concise and relevant response suitable for the identified input field context.
*   **FR5: Response Presentation (MVP)**
    *   FR5.1: Upon receiving a response from the LLM, the extension MUST attempt to auto-fill the targeted input field or textarea with the generated text.
    *   FR5.2: The extension MUST also provide a mechanism for the user to easily copy the generated response to their clipboard (e.g., a "Copy" button in a small notification or UI element that appears post-generation). This serves as a fallback.
*   **FR6: Basic Error Handling**
    *   FR6.1: The extension MUST provide basic visual feedback to the user if an LLM API call fails (e.g., due to an invalid API key, network error, or an error from the LLM provider). This feedback can be a simple notification.

### Non-Functional Requirements (NFR)

*   **NFR1: Usability (MVP)**
    *   NFR1.1: The extension MUST be installable as an unpacked extension in Chrome.
    *   NFR1.2: The process of setting the API key via the options page MUST be straightforward and intuitive.
    *   NFR1.3: Activating the fill functionality via the context menu MUST be simple and discoverable.
*   **NFR2: Responsiveness (MVP)**
    *   NFR2.1: The extension SHOULD provide immediate visual feedback to the user upon activation (e.g., context menu click) to indicate that it is processing the request.
    *   NFR2.2: LLM API calls MUST be asynchronous to prevent freezing the browser UI.
    *   NFR2.3: The time from activation to response presentation SHOULD be perceived as reasonable by the user, acknowledging inherent LLM processing latencies.
*   **NFR3: Security (MVP - Basic)**
    *   NFR3.1: The API key stored via `chrome.storage.local` is sandboxed to the extension. No further complex security measures are in scope for MVP beyond standard Chrome extension security practices.
*   **NFR4: Compatibility**
    *   NFR4.1: The extension MUST function correctly in recent stable versions of Google Chrome.
*   **NFR5: Resource Usage (MVP)**
    *   NFR5.1: The extension SHOULD be lightweight and not consume excessive browser resources in its idle state.

### Assumptions for MVP

*   The primary user is technically proficient enough to obtain an LLM API key and install an unpacked Chrome extension.
*   For context identification, a simple heuristic (combining label, placeholder, name, id) is sufficient for MVP. Complex DOM traversal or advanced NLP for context understanding is out of scope.
*   Auto-filling directly into the input field's `.value` property is the primary method; complex field interactions are out of scope.
*   The extension will not manage multiple profiles or API keys from different providers in the MVP.