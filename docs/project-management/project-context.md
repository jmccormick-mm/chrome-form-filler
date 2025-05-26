# Project Context: ChromeFormFiller

**Date Created:** 2025-05-26
**Last Updated:** 2025-05-26

This document provides a consolidated overview of the ChromeFormFiller project, including its high-level requirements, approved architecture, and technology stack. It serves as a central reference point for all specialized modes involved in the project.

## 1. Project Overview & High-Level Requirements

The ChromeFormFiller project aims to develop a Chrome extension that assists users in filling web form fields using a Large Language Model (LLM).

**Core User Story:**
As a user, I want to right-click on an input field or textarea on a webpage, have the extension understand the context of the field, use an LLM to generate an appropriate response, and then either auto-fill the field or allow me to easily copy the response.

**Key High-Level Requirements (MVP):**
*   **Context Menu Activation:** The extension must provide a context menu option (e.g., "Fill with AI") when right-clicking on eligible form fields (`<input type="text">`, `<input type="email">`, etc., and `<textarea>`).
*   **Secure API Key Management:** Users must be able to securely provide their LLM API key. This will be managed via Supabase:
    *   Authentication (Google OAuth) via an options page.
    *   API key securely stored in Supabase Database, associated with the user, and protected by Row Level Security (RLS).
*   **Context Identification:** The extension must gather context from the targeted form field (e.g., `id`, `name`, `placeholder`, associated `<label>`) to inform the LLM prompt.
*   **LLM Interaction via Secure Proxy:**
    *   The extension's background script will call a Supabase Edge Function.
    *   The Edge Function will retrieve the user's LLM API key from the Supabase Database and make the call to the external LLM provider (e.g., OpenAI).
    *   The LLM API key will **never** be exposed to the client-side.
*   **Response Handling:** The extension should attempt to auto-fill the form field with the LLM's response or provide an easy way to copy the response.
*   **User Feedback:** Basic error handling and status updates (e.g., "Not authenticated," "API key saved").

## 2. Approved Architecture (Supabase-Centric)

The system comprises a Chrome Extension frontend and a Supabase backend.

**Key Components:**

*   **Chrome Extension:**
    *   **Content Script (`content_script.js`):** Injects into pages, detects field interactions, adds context menu, gathers field context, sends data to background script, receives LLM response, and handles field filling/copying.
    *   **Background Script (`background.js` - Service Worker):** Manages context menu, initializes Supabase client, handles user authentication state, receives context from content script, calls Supabase Edge Functions for LLM interaction, and relays responses/errors.
    *   **Options Page (`options.html`, `options.js`):** UI for Supabase authentication (Google OAuth), LLM API key input (which calls an Edge Function to save it securely), and displaying auth status.
    *   **Manifest (`manifest.json`):** Defines extension properties, permissions (including Supabase host permissions), and components. Version: 3.

*   **Supabase Backend:**
    *   **Authentication:** Supabase Auth with Google OAuth as the primary method.
    *   **Database (PostgreSQL):**
        *   Table: `user_llm_api_keys` (stores `user_id`, `api_key_encrypted`, timestamps).
        *   Row Level Security (RLS): Strict policies ensuring users can only access/manage their own API key record.
    *   **Edge Functions (Deno/TypeScript):**
        *   **`llm-proxy`:** Receives field context and user JWT from the extension, retrieves the user's LLM API key from the database (using `service_role_key`), calls the external LLM, and returns the response.
        *   **`save-api-key`:** Receives LLM API key and user JWT, (encrypts if applicable), and saves/updates the key in the database for the authenticated user.

**Data Flow Summary:**
1.  **Auth & API Key Setup:** User authenticates via Google OAuth on the Options Page. Once authenticated, the user enters their LLM API key, which is sent to the `save-api-key` Edge Function and stored in Supabase DB.
2.  **Form Filling:** User right-clicks a field, Content Script sends context to Background Script. If authenticated, Background Script calls `llm-proxy` Edge Function. `llm-proxy` retrieves the user's key, calls the LLM, and returns the response through the Background Script to the Content Script for filling/copying.

**Security Highlights:**
*   LLM API keys are never stored client-side or exposed after initial submission.
*   Supabase Auth handles secure authentication.
*   RLS protects database records.
*   Edge Functions act as a secure backend proxy.

## 3. Approved Technology Stack

*   **Frontend (Chrome Extension):**
    *   JavaScript (ES6+)
    *   HTML5
    *   CSS3
    *   Supabase JS Client Library (`@supabase/supabase-js`)
*   **Backend as a Service (BaaS):**
    *   **Provider:** Supabase
    *   **Services:** Supabase Auth, Supabase Database (PostgreSQL), Supabase Edge Functions (Deno/TypeScript)
    *   **Production URL:** `https://pdwkntyrmxwnthcpsxad.supabase.co`
    *   **Production Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkd2tudHlybXh3bnRoY3BzeGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNTgzOTMsImV4cCI6MjA2MzgzNDM5M30.B74Kc7EgzAV0Xi0huqubmlqxhDdBFoRvDiz63toRnD4`
    *   **Local Dev URL:** `http://127.0.0.1:54321`
    *   **Local Dev Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
    *   **Service Role Key (Production):** Handled via environment variables in Supabase Edge Function settings.
*   **LLM API Provider (Proxied):**
    *   OpenAI (e.g., GPT-4o-mini or GPT-3.5-turbo) for MVP.

## 4. Key Project Documents Reference

*   **Architectural Vision:** [`docs/architecture/architectural-vision-CFF-MVP.md`](docs/architecture/architectural-vision-CFF-MVP.md)
*   **Initial Requirements & MVP Definition:** [`docs/project-management/task-context-new-project-ChromeFormFiller.md`](docs/project-management/task-context-new-project-ChromeFormFiller.md)
*   **Workflow State & Task Tracking:** [`docs/project-management/workflow-state.md`](docs/project-management/workflow-state.md)
*   **Research Findings:** [`docs/research/research-findings.md`](docs/research/research-findings.md)
*   **UI/UX Design (MVP):** [`docs/design/design-system-CFF-MVP.md`](docs/design/design-system-CFF-MVP.md)

This document should be considered the primary source of truth for high-level project context and will be updated as major architectural or requirement decisions are made and approved.