import { serve } from "https://deno.land/std@0.203.0/http/server.ts"; // Using a recent stable version
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL_NAME = "gpt-4o-mini"; // Recommended model

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Or specific origin for security
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FieldContext {
  fieldId?: string;
  fieldName?: string;
  placeholder?: string;
  ariaLabel?: string;
  labelText?: string;
  fieldType?: string;
  currentValue?: string;
}

interface RequestBody {
  fieldContext: FieldContext;
}

// Helper function to return JSON response
function jsonResponse(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...headers },
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method Not Allowed" }, 405);
  }

  let supabaseClient: SupabaseClient;
  let user;

  try {
    // 1. Authenticate user with JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonResponse({ success: false, error: "Missing or invalid Authorization header" }, 401);
    }
    const jwt = authHeader.replace("Bearer ", "");

    // Create Supabase client with the user's JWT to validate it and get user info
    // SUPABASE_URL and SUPABASE_ANON_KEY are automatically available in Supabase Edge Functions
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("SUPABASE_URL or SUPABASE_ANON_KEY env variables not set.");
      return jsonResponse({ success: false, error: "Server configuration error." }, 500);
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !authUser) {
      console.error("JWT validation error:", authError?.message);
      return jsonResponse({ success: false, error: "Invalid or expired JWT." }, 401);
    }
    user = authUser;

    // 2. Parse request body
    const { fieldContext } = (await req.json()) as RequestBody;
    if (!fieldContext) {
      return jsonResponse({ success: false, error: "Missing 'fieldContext' in request body" }, 400);
    }

    // 3. API Key Retrieval using Service Role Key
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseServiceRoleKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY env variable not set.");
      return jsonResponse({ success: false, error: "Server configuration error for service role." }, 500);
    }

    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: apiKeyData, error: apiKeyError } = await supabaseAdminClient
      .from("user_llm_api_keys")
      .select("api_key_encrypted") // Assuming this column holds the usable key for MVP
      .eq("user_id", user.id)
      .single();

    if (apiKeyError || !apiKeyData || !apiKeyData.api_key_encrypted) {
      if (apiKeyError && apiKeyError.code === 'PGRST116') { // PGRST116: "The result contains 0 rows"
         console.warn(`API key not found for user ${user.id}`);
         return jsonResponse({ success: false, error: "OpenAI API key not set up for this user." }, 403);
      }
      console.error(`Error retrieving API key for user ${user.id}:`, apiKeyError?.message);
      return jsonResponse({ success: false, error: "Failed to retrieve API key." }, 500);
    }
    const userOpenAIKey = apiKeyData.api_key_encrypted;

    // 4. LLM Prompt Construction
    const { labelText = "", placeholder = "", currentValue = "" } = fieldContext;
    // Basic prompt, can be enhanced
    let promptText = "Given a web form field";
    if (labelText) promptText += ` with label "${labelText}"`;
    if (placeholder) promptText += `, placeholder "${placeholder}"`;
    if (currentValue) promptText += `, and current value "${currentValue}"`;
    promptText += ". Suggest an appropriate and concise completion or value for this field. If the context is insufficient, provide a generic placeholder or a polite refusal.";
    
    // 5. External LLM API Call (OpenAI)
    const openAIResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userOpenAIKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL_NAME,
        messages: [{ role: "user", content: promptText }],
        max_tokens: 150, // Adjust as needed for MVP
        temperature: 0.7, // Adjust for creativity
      }),
    });

    if (!openAIResponse.ok) {
      const errorBody = await openAIResponse.json().catch(() => ({}));
      console.error("OpenAI API error:", openAIResponse.status, errorBody);
      const errorMessage = errorBody.error?.message || `OpenAI API request failed with status ${openAIResponse.status}`;
      return jsonResponse({ success: false, error: `OpenAI API error: ${errorMessage}` }, 502); // 502 Bad Gateway
    }

    const openAIData = await openAIResponse.json();
    const generatedText = openAIData.choices?.[0]?.message?.content?.trim();

    if (!generatedText) {
      console.error("No generated text in OpenAI response:", openAIData);
      return jsonResponse({ success: false, error: "LLM did not return usable text." }, 500);
    }

    // 6. Return Response
    return jsonResponse({ success: true, generatedText });

  } catch (error) {
    console.error("Unhandled error in llm-proxy function:", error);
    return jsonResponse({ success: false, error: "Internal server error." }, 500);
  }
});