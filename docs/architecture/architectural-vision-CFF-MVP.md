# Architectural Vision: ChromeFormFiller MVP (CFF-003.A - Supabase Revision)

**Date:** 2025-05-26
**Author:** Visionary Mode
**Interaction Mode:** YOLO MVP
**Status:** Revised - Pending User Approval for Supabase Integration

## 1. Overview

This document outlines the revised high-level architecture and technology stack for the ChromeFormFiller Minimum Viable Product (MVP). The primary goal is to create a simple Chrome extension that allows users to leverage an LLM to fill web form fields. This revision incorporates **Supabase** for backend functionality, including authentication, secure API key storage, and proxying LLM calls, prioritizing ease of setup, core functionality, and enhanced security for user API keys.

## 2. High-Level Architecture

The Chrome extension and its backend will be composed of the following key components:

*   **Content Script (`content_script.js`):**
    *   **Responsibilities:**
        *   Injects into active web pages.
        *   Detects right-clicks on eligible HTML input fields (`<input type="text">`, `<input type="email">`, `<input type="search">`, `<input type="tel">`, `<input type="url">`) and `<textarea>` elements.
        *   Adds a context menu item (e.g., "Fill with AI").
        *   On context menu click:
            *   Gathers contextual information from the targeted field (e.g., `id`, `name`, `placeholder`, `aria-label`, associated `<label>` text).
            *   Sends this context and target element details to the background script.
        *   Receives the LLM-generated response (or error messages) from the background script.
        *   Attempts to auto-fill the targeted input field with the response.
        *   Provides a secondary mechanism for the user to copy the generated response (e.g., via a temporary notification with a "Copy" button).
        *   May display messages related to authentication status (e.g., "Please log in via options page").
    *   **Key Interactions:** Web page DOM, Background Script.

*   **Background Script (`background.js`) (Service Worker):**
    *   **Responsibilities:**
        *   Manages the lifecycle of the extension, including the creation and event handling for the context menu item.
        *   Initializes the Supabase JS client with the project URL and anon key.
        *   Manages user authentication state with Supabase (e.g., checking current session, listening for auth changes).
        *   Listens for messages from the content script (containing input field context).
        *   If the user is authenticated:
            *   Constructs an appropriate prompt for the LLM based on the gathered context.
            *   Makes asynchronous calls to a Supabase Edge Function (`llm-proxy`), passing the prompt and the user's Supabase access token.
        *   If the user is not authenticated, notifies the content script to prompt the user to log in via the options page.
        *   Implements basic error handling for Edge Function calls (e.g., network issues, function errors).
        *   Sends the LLM's generated text or relevant error messages back to the content script.
    *   **Key Interactions:** Chrome Extension APIs (contextMenus, storage, runtime messaging), Content Script, Supabase JS Client, Supabase Edge Functions.

*   **Options Page (`options.html`, `options.js`):**
    *   **Responsibilities:**
        *   Provides a user interface for extension configuration.
        *   Handles user authentication with Supabase, primarily using **Google OAuth** (as per user preference). This will involve redirecting to Supabase for the OAuth flow.
        *   Once authenticated, allows the user to input and save their LLM API key. This action will call a Supabase Edge Function (`save-api-key`) to securely store the key in the Supabase database, associated with their user ID.
        *   Displays user authentication status (e.g., "Logged in as user@example.com", "Not logged in").
        *   Provides a "Log Out" button.
        *   `options.js` will handle:
            *   Initializing the Supabase JS client.
            *   Managing OAuth sign-in and sign-out flows.
            *   Securely sending the API key to the `save-api-key` Edge Function.
            *   Displaying feedback to the user (e.g., "API Key saved successfully," "Login successful," error messages).
    *   **Key Interactions:** Chrome Extension APIs (runtime messaging for auth state updates if needed), User, Supabase JS Client, Supabase Edge Functions.

*   **Supabase Backend:**
    *   **Authentication:**
        *   Utilizes Supabase Auth for user identity management.
        *   **Primary Method:** Google OAuth (as per user preference).
        *   Supabase handles the OAuth flow, token issuance (JWTs), and session management.
    *   **Database (PostgreSQL):**
        *   A table (e.g., `user_llm_api_keys`) to store user-specific LLM API keys.
        *   **Schema:**
            *   `id` (UUID, primary key)
            *   `user_id` (UUID, foreign key referencing `auth.users.id`, unique, not nullable)
            *   `api_key_encrypted` (TEXT, stores the encrypted LLM API key, not nullable)
            *   `created_at` (TIMESTAMPTZ, default `now()`)
            *   `updated_at` (TIMESTAMPTZ, default `now()`)
        *   Encryption of the API key should be handled (e.g., using `pgsodium` if available/configured, or application-level encryption within Edge Functions before storing, though server-side encryption via Supabase Vault or similar is preferred if available for Edge Functions). For MVP, direct storage with RLS is the baseline, but encryption is a strong recommendation.
    *   **Row Level Security (RLS):**
        *   Strict RLS policies MUST be enabled on the `user_llm_api_keys` table.
        *   Users can only `SELECT`, `INSERT`, `UPDATE`, `DELETE` their own API key record (i.e., where `user_id = auth.uid()`).
        *   The `service_role_key` will bypass RLS when used within Edge Functions for legitimate key retrieval.
    *   **Edge Function(s) (Deno/TypeScript):**
        *   **`llm-proxy`:**
            *   Receives form field context and the user's JWT from the authenticated Chrome extension (Background Script).
            *   Verifies the JWT and extracts the `user_id`.
            *   Uses the `service_role_key` (from environment variables) to create a Supabase client with elevated privileges.
            *   Retrieves the authenticated user's (decrypted) LLM API key from the `user_llm_api_keys` table.
            *   Makes the API call to the external LLM provider (e.g., OpenAI, Gemini) using the retrieved key.
            *   Returns the LLM's response (or error) to the Chrome extension.
            *   **Ensures the user's LLM API key never leaves the Supabase backend.**
        *   **`save-api-key`:**
            *   Receives the LLM API key and the user's JWT from the authenticated Chrome extension (Options Page).
            *   Verifies the JWT and extracts the `user_id`.
            *   (Encrypts the API key if application-level encryption is used).
            *   Saves/updates the (encrypted) API key in the `user_llm_api_keys` table for the authenticated user.
            *   Returns a success/error status.

*   **Manifest File (`manifest.json`):**
    *   **Responsibilities:** Defines the core properties, permissions, and components.
    *   **`manifest_version`**: 3
    *   **`name`**: "ChromeFormFiller"
    *   **`version`**: "0.2.0" (updated for Supabase integration)
    *   **`description`**: "Fills web form fields using an LLM, with Supabase backend."
    *   **`permissions`**:
        *   `contextMenus`: Essential for adding the right-click menu item.
        *   `storage`: Required for storing Supabase session information and potentially other local settings.
        *   `activeTab`: Grants necessary access to the content of the currently active tab.
        *   `notifications` (Optional): For non-intrusive feedback.
        *   `scripting`: To programmatically inject scripts.
        *   *(Note: `identity` permission is likely NOT needed if Supabase handles OAuth via redirects from the options page, which is simpler for MVP.)*
    *   **`host_permissions`**:
        *   `https://pdwkntyrmxwnthcpsxad.supabase.co/*`: Necessary for the extension to communicate with the user's Supabase project (Auth, Edge Functions).
        *   *(Direct LLM API URLs like `https://api.openai.com/*` are REMOVED as calls are now proxied).*
    *   **`background`**: Specifies the background service worker script (`background.js`).
    *   **`content_scripts`**: Declares `content_script.js` (e.g., `matches: ["<all_urls>"]`).
    *   **`options_page`**: Points to `options.html`.
    *   **`action`** (Browser Action - Recommended):
        *   Defines a toolbar icon. Clicking could open options or show auth status.

## 3. Technology Stack (MVP - Revised for Supabase)

1.  **Frontend (Chrome Extension Core):**
    *   **Languages/Technologies:**
        *   JavaScript (ES6+)
        *   HTML5
        *   CSS3
        *   **Supabase JS Client Library (`@supabase/supabase-js`):** For interacting with Supabase Auth, Database (if needed directly, though mostly via Edge Functions), and Edge Functions.
    *   **Rationale:** Native technologies for Chrome extensions, Supabase client for backend integration.

2.  **Backend as a Service (BaaS):**
    *   **Provider:** Supabase
    *   **Components Used:**
        *   Supabase Auth (Google OAuth)
        *   Supabase Database (PostgreSQL) for storing encrypted LLM API keys with RLS.
        *   Supabase Edge Functions (Deno/TypeScript) for secure LLM API proxying and API key management.
    *   **User-Provided Details:**
        *   Production URL: `https://pdwkntyrmxwnthcpsxad.supabase.co`
        *   Production Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkd2tudHlybXh3bnRoY3BzeGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNTgzOTMsImV4cCI6MjA2MzgzNDM5M30.B74Kc7EgzAV0Xi0huqubmlqxhDdBFoRvDiz63toRnD4`
        *   Local Dev URL: `http://127.0.0.1:54321`
        *   Local Dev Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
        *   Service Role Key (Production Edge Functions): To be handled via environment variables.
    *   **Rationale:** Addresses security concerns of client-side API key storage, provides robust authentication, and allows server-side logic via Edge Functions. Aligns with user's explicit requirement for Supabase integration.

3.  **LLM API Provider (Proxied):**
    *   **Selected Provider:** OpenAI (e.g., GPT-4o-mini or GPT-3.5-turbo) for MVP.
    *   **Rationale:** User familiarity and ease of use for the underlying LLM. Calls are now securely proxied through Supabase Edge Functions. The architecture supports switching/adding other LLM providers in the future by modifying/adding Edge Functions.

## 4. Data Flow (Revised for Supabase)

```mermaid
sequenceDiagram
    participant User
    participant ContentScript as CS (Chrome Extension)
    participant BackgroundScript as BS (Chrome Extension)
    participant OptionsPage as OP (Chrome Extension)
    participant SupabaseAuth as SA (Supabase)
    participant SupabaseDB as SDB (Supabase - user_llm_api_keys table)
    participant EdgeFunctionSaveKey as EF_Save (Supabase)
    participant EdgeFunctionLLMProxy as EF_Proxy (Supabase)
    participant ExternalLLM as LLM (e.g., OpenAI)

    %% Authentication and API Key Setup Flow
    User->>OP: Opens Options Page
    OP->>SA: Initiates Google OAuth Sign-in
    SA-->>User: Redirects to Google for Auth
    User-->>SA: Google Auth Success, Redirects back to OP with token/code
    SA-->>OP: User Authenticated (Session established)
    OP->>User: Displays "Logged In" status
    User->>OP: Enters LLM API Key & Clicks Save
    OP->>BS: (Optional: or directly) Prepare to call EF_Save
    BS->>EF_Save: Invokes Edge Function (save-api-key) with API Key and User JWT
    activate EF_Save
    EF_Save->>SDB: Securely stores/updates (encrypted) API Key for user_id
    SDB-->>EF_Save: Success/Failure
    EF_Save-->>BS: Returns status
    deactivate EF_Save
    BS->>OP: (Optional) Relays save status
    OP->>User: Shows "API Key Saved"

    %% Form Filling Flow
    User->>CS: Right-clicks input field
    CS->>BS: Sends field context
    BS->>SA: Checks Auth Status (has valid session?)
    alt User Authenticated
        BS->>EF_Proxy: Invokes Edge Function (llm-proxy) with field context and User JWT
        activate EF_Proxy
        EF_Proxy->>SDB: Retrieves user's (decrypted) LLM API Key (using service_role_key)
        SDB-->>EF_Proxy: Returns API Key
        EF_Proxy->>LLM: Makes API call with prompt and user's key
        activate LLM
        LLM-->>EF_Proxy: Returns LLM response
        deactivate LLM
        EF_Proxy-->>BS: Returns LLM response
        deactivate EF_Proxy
        BS->>CS: Sends LLM response
        CS->>User: Fills field / Shows "Copy" option
    else User NOT Authenticated
        BS->>CS: Sends "Not Authenticated" message
        CS->>User: Shows "Please log in via Options" notification
    end
```

## 5. Security Considerations with Supabase

*   **LLM API Key Security:** The primary benefit of this architecture. User LLM API keys are:
    *   Never stored in the Chrome extension's local storage.
    *   Transmitted from the Options Page directly to a Supabase Edge Function (`save-api-key`) over HTTPS.
    *   Stored encrypted (recommended) in the Supabase database.
    *   Only accessed by the `llm-proxy` Edge Function using the `service_role_key` within the secure Supabase environment.
    *   Never exposed to the client-side after initial submission.
*   **Authentication:** Supabase Auth (with Google OAuth) provides robust and secure user authentication. JWTs are used to authorize calls to Edge Functions.
*   **Row Level Security (RLS):** Ensures that even if direct database access from the client was attempted (which it shouldn't be for API keys), users could only ever see/modify their own `user_llm_api_keys` record.
*   **Edge Functions:** Act as a secure backend layer. The `service_role_key` required for privileged operations (like reading any user's API key *after* authentication) is stored as an environment variable in Supabase, not exposed to the client.
*   **HTTPS:** All communication between the extension and Supabase (Auth, Edge Functions) is over HTTPS.
*   **Supabase Anon Key:** This key is public and allows client-side initialization and access to RLS-protected resources and authentication. It does not grant write access to sensitive data without RLS or bypass Edge Function security.
*   **Permissions:** The Chrome extension requests minimal necessary permissions. `host_permissions` are restricted to the Supabase project URL.

## 6. Deployment Considerations

*   **Chrome Extension:**
    *   Deployed as an unpacked extension for MVP.
    *   The Supabase Project URL and Anon Key will be embedded in the extension's JavaScript (`background.js`, `options.js`) for initializing the Supabase client.
*   **Supabase Project:**
    *   **Schema:** The `user_llm_api_keys` table needs to be created with appropriate columns and RLS policies.
    *   **Authentication:** Google OAuth provider must be configured in Supabase Auth settings.
    *   **Edge Functions:**
        *   `llm-proxy` and `save-api-key` functions need to be developed (e.g., using Deno/TypeScript) and deployed to Supabase (e.g., via Supabase CLI).
        *   The `service_role_key` MUST be configured as an environment variable for these functions in the Supabase project settings for production.
        *   Secrets for external LLM API calls (if the Edge Function needs its *own* fallback key, though the design is for user-provided keys) would also be environment variables.
    *   **Local Development:**
        *   Use local Supabase instance (`supabase start`).
        *   Local Supabase URL (`http://127.0.0.1:54321`) and local anon key should be used in the extension during development.
        *   Local `service_role_key` can be used for testing Edge Functions locally.

## 7. Key Assumptions for MVP Architecture (Revised)

*   The architecture prioritizes core functionality and security of user API keys.
*   Supabase provides sufficient scalability and reliability for MVP needs.
*   Users are comfortable authenticating via Google OAuth.
*   The primary LLM for MVP is OpenAI, proxied via Supabase.
*   Error handling will be user-friendly but not overly complex for MVP.
*   Encryption of API keys at rest in Supabase DB is strongly recommended and should be implemented if feasible within MVP scope (e.g., using `pgsodium` or application-level encryption in Edge Functions).

## 8. Next Steps & Handoff

This revised architectural vision, incorporating Supabase, provides the foundation for subsequent development:
*   **Blueprinter Mode:** Can use this vision to create detailed specifications for:
    *   Chrome extension components (`content_script.js`, `background.js`, `options.html/js`) including Supabase client integration and auth flows.
    *   Supabase database schema for `user_llm_api_keys` table, including RLS policies.
    *   Supabase Edge Function (`llm-proxy`, `save-api-key`) logic, input/output contracts, and error handling.
    *   Detailed data flow for authentication and API key management.
*   **BackendForge/ApiArchitect/DataArchitect Modes:** Will implement the Supabase backend components (DB schema, RLS, Edge Functions).
*   **FrontCrafter Mode:** Will implement the Chrome extension frontend components.
*   **SecurityStrategist Mode:** Should review RLS policies, Edge Function security, and API key encryption strategy.

This document will be communicated to Maestro to update the overall project workflow state. **User approval for this specific Supabase integration architectural revision is required before proceeding with detailed design and implementation.**