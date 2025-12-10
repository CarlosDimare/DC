import { createClient } from '@supabase/supabase-js';

// Access environment variables safely handling TS error for import.meta.env
const meta = import.meta as any;
const env = meta.env || {};

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://yvuwoswxqjdmdpxubhth.supabase.co';
const supabaseKey = env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2dXdvc3d4cWpkbWRweHViaHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MTE0NDYsImV4cCI6MjA4MDM4NzQ0Nn0.Eo9khFmM6iJsEpxy6fAIxHqXpNIsQ1HoIBSmPE-8ru4';

// Validar que existan antes de crear el cliente para evitar errores fatales en runtime si faltan
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;