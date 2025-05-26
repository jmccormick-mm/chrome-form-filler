# Task Context: CFF-006 - Project Structure Setup

**Date:** 2025-05-26
**Associated Task ID:** CFF-006
**Overall Project:** ChromeFormFiller MVP

## 1. Objective
Create the basic directory structure and initial `manifest.json` for the ChromeFormFiller extension. This setup must align with the Supabase-integrated architecture defined in [`docs/architecture/architectural-vision-CFF-MVP.md`](docs/architecture/architectural-vision-CFF-MVP.md).

## 2. Key Requirements & Scope
*   **Root Directory:**
    *   Create `manifest.json`.
*   **`/src` Directory:** Create this main source directory.
    *   **`/src/background`:** For background script logic.
        *   Create placeholder `background.js`.
    *   **`/src/content`:** For content script logic.
        *   Create placeholder `content_script.js`.
    *   **`/src/options`:** For the extension's options page.
        *   Create placeholder `options.html`.
        *   Create placeholder `options.js`.
    *   **`/src/core`:** For shared utilities, including Supabase client initialization.
        *   Create placeholder `supabaseClient.js`.
    *   **`/src/assets`:** For static assets.
        *   **`/src/assets/icons`:** For extension icons.
            *   Create placeholder `icon16.png`, `icon48.png`, `icon128.png`. (Actual icons can be designed by Artisan later if needed, simple placeholders are fine for structure).

## 3. `manifest.json` Specifics
*   Refer to the "Manifest File (`manifest.json`)" section within the revised [`docs/architecture/architectural-vision-CFF-MVP.md`](docs/architecture/architectural-vision-CFF-MVP.md).
*   Ensure `host_permissions` includes the production Supabase Project URL: `https://pdwkntyrmxwnthcpsxad.supabase.co/*` and any other necessary permissions for Supabase authentication (e.g., if Google OAuth needs specific permissions, though typically handled by Supabase SDK redirects).
*   Remove direct LLM API provider URLs from `host_permissions`.
*   Define `background`, `content_scripts`, `options_page`, and a basic `action` (browser popup).

## 4. Deliverables
*   The complete directory structure as outlined above.
*   The initial `manifest.json` file configured for Supabase.
*   All specified placeholder files.
*   Confirmation of task completion.

## 5. Dependencies
*   CFF-003.A: Architectural Revision: Supabase Integration (Completed)
*   CFF-004: Technology Research (Completed)

This context file is for FrontCrafter to set up the initial project structure.