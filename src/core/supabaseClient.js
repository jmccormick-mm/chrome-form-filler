import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase project details from docs/project-management/project-context.md
const supabaseUrl = 'https://pdwkntyrmxwnthcpsxad.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkd2tudHlybXh3bnRoY3BzeGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNTgzOTMsImV4cCI6MjA2MzgzNDM5M30.B74Kc7EgzAV0Xi0huqubmlqxhDdBFoRvDiz63toRnD4';

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Supabase client initialized in src/core/supabaseClient.js');