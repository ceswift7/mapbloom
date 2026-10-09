/* ======================================================================
   CLOUD SETTINGS: accounts, cloud save and friends are switched on by filling these two values in
   (Supabase project URL and the public "anon" key: Project Settings -> API). Both are safe to publish: the database is protected
   by the row level security in supabase/schema.sql. Never put the "service_role" key here.
   Left empty, the game is exactly as before: no sign-in, nothing leaves the device.
   ====================================================================== */
const MB_CLOUD={url:"",key:""};
