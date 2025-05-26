# Task Context: CFF-010 - Core Feature: LLM API Integration (Supabase Edge Function)

**Task ID:** CFF-010
**Depends On:** CFF-009 (Context Menu Implementation)
**Delegated Mode(s):** ApiArchitect (for Edge Function), BackendForge (for Edge Function if complex, or review), FrontCrafter (for background.js updates) - Primary: ApiArchitect
**Estimated Complexity:** High

## 1. Objective

Implement the LLM API integration by:
1.  Creating and deploying a Supabase Edge Function named `llm-proxy`. This function will securely handle calls to the external LLM provider (OpenAI).
2.  Updating the Chrome extension's background script (`src/background/background.js`) to call this `llm-proxy` Edge Function, passing the necessary field context and user authentication token.

## 2. Scope and Deliverables

### A. Supabase Edge Function: `llm-proxy` (Responsibility: ApiArchitect, supported by BackendForge)

*   **Location:** `supabase/functions/llm-proxy/index.ts` (or similar, following Supabase conventions for Deno/TypeScript Edge Functions).
*   **Functionality:**
    *   The function MUST be invokable via a POST request.
    *   It MUST expect a JSON body containing:
        *   `fieldContext`: The structured context object gathered by the content script (e.g., `{ fieldId: '...', fieldName: '...', placeholder: '...', ariaLabel: '...', labelText: '...', fieldType: '...', currentValue: '...' }`).
    *   It MUST expect an Authorization header with the user's Supabase JWT (`Bearer <token>`).
    *   **Authentication & Authorization:**
        *   Verify the incoming JWT. If invalid or missing, return an appropriate error (e.g., 401 Unauthorized).
        *   Extract the `user_id` from the valid JWT.
    *   **API Key Retrieval:**
        *   Initialize a Supabase client using the `SUPABASE_SERVICE_ROLE_KEY` (which MUST be configured as an environment variable in the Supabase project settings for this function).
        *   Query the `user_llm_api_keys` table to retrieve the `api_key_encrypted` for the authenticated `user_id`.
        *   If no key is found for the user, return an appropriate error (e.g., 403 Forbidden or a custom error indicating API key not set up).
        *   **(Future/Ideal):** Decrypt the API key if it's stored encrypted (e.g., using `pgsodium`). For MVP, if direct encryption/decryption in Edge Functions is complex, ensure RLS is the primary guard and acknowledge this as a future hardening step. The architectural vision mentions encryption as a strong recommendation.
    *   **LLM Prompt Construction:**
        *   Based on the received `fieldContext`, construct a suitable prompt for the LLM. Example: "Given a form field with label '{labelText}', placeholder '{placeholder}', and current value '{currentValue}', what is an appropriate response or completion?"
    *   **External LLM API Call (OpenAI):**
        *   Make an HTTPS POST request to the OpenAI API (e.g., `https://api.openai.com/v1/chat/completions` for chat models like GPT-3.5-turbo or GPT-4o-mini).
        *   Use the retrieved (and decrypted, if applicable) user's OpenAI API key in the Authorization header for the OpenAI API call.
        *   Send the constructed prompt.
        *   Handle potential errors from the OpenAI API (e.g., invalid key, rate limits, server errors) and return appropriate error responses to the client.
    *   **Response Handling:**
        *   On successful LLM response, extract the generated text.
        *   Return a JSON response to the calling background script, e.g., `{ "success": true, "generatedText": "..." }` or `{ "success": false, "error": "message" }`.
    *   **Error Handling:** Implement robust error handling for all stages (JWT verification, DB query, LLM call).
    *   **Dependencies:** Ensure Deno, Supabase CLI, and any necessary TypeScript/Deno libraries for making HTTP requests are set up for Edge Function development.
*   **Deployment:** The Edge Function MUST be deployable to the Supabase project (e.g., using `supabase functions deploy llm-proxy`).

### B. Background Script Updates (`src/background/background.js`) (Responsibility: FrontCrafter)

*   **Modify Existing Logic:**
    *   When the background script receives the `fieldContextMenuClicked` message (or similar, from CFF-009) containing the `fieldContext` from the content script:
        *   Check if the user is authenticated with Supabase (i.e., has an active session).
            *   If not authenticated, send a message back to the content script to inform the user (e.g., `{ type: 'AUTH_REQUIRED' }`).
            *   If authenticated:
                *   Retrieve the current user's Supabase session/access token.
                *   Make an asynchronous `fetch` call (POST request) to the deployed `llm-proxy` Supabase Edge Function.
                    *   URL: `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/llm-proxy` (ensure this matches the actual deployed function URL).
                    *   Headers:
                        *   `Authorization: Bearer <USER_ACCESS_TOKEN>`
                        *   `Content-Type: application/json`
                        *   `apikey: <SUPABASE_ANON_KEY>` (Supabase anon key for invoking the function)
                    *   Body: JSON.stringify({ `fieldContext` })
                *   Handle the response from the Edge Function:
                    *   If successful (e.g., `response.ok` and `data.success === true`), extract `data.generatedText`. Send this text back to the content script (e.g., `{ type: 'LLM_RESPONSE', text: data.generatedText }`).
                    *   If error (e.g., `!response.ok` or `data.success === false`), extract `data.error`. Send an error message back to the content script (e.g., `{ type: 'LLM_ERROR', message: data.error }`).
                *   Implement basic error handling for the `fetch` call itself (e.g., network errors).

## 3. Acceptance Criteria

*   **Edge Function (`llm-proxy`):**
    *   Successfully deploys to Supabase.
    *   Returns 401 if no/invalid JWT is provided.
    *   Retrieves the correct user API key from `user_llm_api_keys` based on the JWT's `user_id`.
    *   Returns an error if the user has no API key set.
    *   Correctly constructs a prompt from `fieldContext`.
    *   Successfully calls the OpenAI API using the user's key.
    *   Returns the LLM's generated text in a success response.
    *   Returns appropriate error messages for OpenAI API failures or internal errors.
*   **Background Script (`src/background/background.js`):**
    *   Correctly retrieves the Supabase access token for an authenticated user.
    *   Successfully calls the `llm-proxy` Edge Function with the correct headers and body.
    *   Correctly processes success responses from the Edge Function and relays `generatedText` to the content script.
    *   Correctly processes error responses from the Edge Function and relays error messages to the content script.
    *   Handles cases where the user is not authenticated before attempting to call the Edge Function.
*   **Integration:**
    *   The overall flow from context menu click -> background script -> Edge Function -> OpenAI -> Edge Function -> background script -> (logged for now, or basic message to content script) is functional.

## 4. Key Context Files to Read

*   **MUST READ:** [`docs/project-management/project-context.md`](docs/project-management/project-context.md)
*   **MUST READ:** [`docs/architecture/architectural-vision-CFF-MVP.md`](docs/architecture/architectural-vision-CFF-MVP.md) (Sections 2, 3, 4, 5, 6 - especially Edge Function details and data flow)
*   **MUST READ:** [`docs/project-management/task-context-CFF-009.md`](docs/project-management/task-context-CFF-009.md) (To understand the `fieldContext` object structure)
*   **MUST READ:** [`docs/research/research-findings.md`](docs/research/research-findings.md) (For Supabase Edge Functions, Deno, OpenAI API usage)
*   Review existing [`src/background/background.js`](src/background/background.js:1) (as modified by CFF-009).
*   Supabase documentation on Edge Functions, Auth, and Database access.
*   OpenAI API documentation.

## 5. Interaction Mode

*   YOLO MVP (as per [`docs/project-management/workflow-state.md`](docs/project-management/workflow-state.md:7))

## 6. Notes & Potential Challenges

*   **Environment Variables:** `SUPABASE_SERVICE_ROLE_KEY` and potentially `OPENAI_API_KEY` (if a default/fallback is used by the function itself, though user-specific keys are primary) MUST be set up in the Supabase project settings for the Edge Function.
*   **CORS:** Ensure appropriate CORS headers are configured for the Edge Function if not handled by default by Supabase in a way that allows invocation from the Chrome extension origin. (Supabase usually handles this well for functions invoked with the anon key).
*   **Local Development & Testing:** Setting up local Supabase environment (`supabase start`) and testing Edge Functions locally will be crucial. The extension will need to be configured to point to the local Supabase URLs during development.
*   **API Key Encryption/Decryption:** This is a sensitive part. If full `pgsodium` integration is too complex for MVP, ensure the design clearly states that keys are stored with RLS as the main protection and encryption is a high-priority follow-up.
*   **Error Propagation:** Ensure errors are propagated meaningfully from the LLM to the Edge Function, and then to the background script, so the user can eventually be informed.
*   **TypeScript/Deno:** ApiArchitect/BackendForge should be comfortable with TypeScript for Supabase Edge Functions.