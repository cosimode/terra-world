import { createClient } from '@supabase/supabase-js';

// Sostituisci con i TUOI dati che trovi su Supabase > Project Settings > API
const supabaseUrl = 'https://tshdlcjepksleuvjqhli.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzaGRsY2plcGtzbGV1dmpxaGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjkxOTgsImV4cCI6MjA3OTkwNTE5OH0.gSdBanQsMpzUkXT_af4fvLtpXeUoVDtkX1CqcKs0brU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);