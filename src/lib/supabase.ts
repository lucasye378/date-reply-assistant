import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ?? "";

export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey && supabaseUrl !== "placeholder.supabase.co"
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;
