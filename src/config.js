/* STORED SETTINGS: the live Supabase values are kept in config.cloud.js. To switch accounts and friends back on (when the custom domain and email sender are ready), copy the MB_CLOUD line from config.cloud.js over the one below and rebuild. */
/* ======================================================================
   CLOUD SETTINGS: accounts, cloud save and friends are switched on by filling these two values in
   (Supabase project URL and the public "anon" key: Project Settings -> API). Both are safe to publish: the database is protected
   by the row level security in supabase/schema.sql. Never put the "service_role" key here.
   Left empty, the game is exactly as before: no sign-in, nothing leaves the device.
   ====================================================================== */
const MB_CLOUD={url:"",key:""};
