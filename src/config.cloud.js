/* ======================================================================
   CLOUD SETTINGS: accounts, cloud save and friends are switched on by filling these two values in
   (Supabase project URL and the public "anon" key: Project Settings -> API). Both are safe to publish: the database is protected
   by the row level security in supabase/schema.sql. Never put the "service_role" key here.
   Left empty, the game is exactly as before: no sign-in, nothing leaves the device.
   ====================================================================== */
const MB_CLOUD={url:"https://dzupkcjnjywohdjbvtnx.supabase.co",key:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6dXBrY2puanl3b2hkamJ2dG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MDk3ODQsImV4cCI6MjEwNzA4NTc4NH0.BQf-cGcxwtHvmjvWWwcHsS1eLBYQtb1-UuSDajZmJnA"};
