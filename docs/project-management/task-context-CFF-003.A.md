# Task Context: CFF-003.A - Architectural Revision for Supabase Integration

**Date:** 2025-05-26
**Associated Task ID:** CFF-003.A (Architectural Revision: Supabase Integration)
**User Request Source:** User message on 2025-05-26, 6:48 AM

## 1. Objective
Revise the high-level architecture for the "ChromeFormFiller" MVP to incorporate Supabase for backend functionality, specifically for:
1.  **Authentication:** Securely identify users.
2.  **Database Table:** Store user-specific sensitive data (e.g., LLM API keys) linked to their authenticated identity.
3.  **Row Level Security (RLS):** Ensure users can only access their own data.
4.  **Edge Function(s):** Act as a secure proxy to make calls to external LLM APIs (OpenAI/Gemini) using the user's stored API key. The key should never leave the Supabase backend.
5.  **Deployment:** The Edge Function(s) must be deployable and accessible by the Chrome extension.

This change supersedes the previous plan of storing API keys directly in `chrome.storage.local` and making direct calls to LLM providers from the extension's background script.

## 2. User's Detailed Supabase Requirements:

The user has outlined the following components and their purposes for the Supabase integration:

1.  **Authentication: The Identity Layer**
    *   **Purpose:** To answer the question, "Who is this user?" This is the front door to your service, allowing users to log in securely so your application can reliably identify them without you ever needing to handle passwords.

2.  **Database Table: The Secure Vault**
    *   **Purpose:** To create a private, secure box for each user inside your database. This vault is where you will store their sensitive API key, linking it directly to their identity from the Authentication step.

3.  **Row Level Security (RLS): The Vault's Unbreakable Lock**
    *   **Purpose:** To enforce the non-negotiable rule that a user can *only* access their own vault. This is the fundamental security mechanism that guarantees no user can ever see or tamper with another user's stored API key.

4.  **Edge Function: The Secure Butler (Proxy)**
    *   **Purpose:** To act as a trusted intermediary that performs tasks on the user's behalf. When your extension needs to use an API key, it asks this "butler." The butler then securely opens the user's vault, uses the key to talk to OpenAI/Gemini, and returns with the result. This ensures the sensitive key never leaves your secure backend.

5.  **Deployment: Going Live**
    *   **Purpose:** To take the "butler" (your Edge Function code) from its blueprint on your computer and make it a live, functioning service on the internet. This is what makes your backend accessible to your Chrome extension from anywhere, at any time.

## 3. Key Architectural Changes Implied:

*   The Chrome extension will need an authentication flow to sign users into Supabase.
*   The Options page (`options.html`, `options.js`) will likely change. Instead of directly inputting an LLM API key, users might authenticate with Supabase and then, within a secure context, provide their LLM API key to be stored in the Supabase database.
*   The Background Script (`background.js`) will no longer directly call LLM APIs. It will instead call the Supabase Edge Function, passing necessary data (e.g., form field context) and relying on the Edge Function to handle LLM interaction.
*   The `manifest.json` `host_permissions` will change. Direct LLM API provider URLs (e.g., `https://api.openai.com/*`) will likely be removed and replaced with the Supabase project URL for the Edge Function(s).
*   The data flow will be significantly different, involving authentication steps and calls to Supabase Edge Functions.

## 4. Information to Elicit from User:
Visionary mode will need to discuss with the user what specific details and credentials from their Supabase project will be required for the development team to proceed with implementation. This might include:
*   Supabase Project URL
*   Supabase Anon Key (public key for client-side SDK)
*   Guidance on how service_role key or other secrets for Edge Functions should be handled/provided for development and deployment.
*   Any preferences on authentication methods (e.g., email/password, OAuth providers).

This document provides the context for Visionary to update the architectural vision.