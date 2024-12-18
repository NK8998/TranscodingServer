const getSecrets = require("../secrets/secrets");
const { createClient } = require("@supabase/supabase-js");

const supabaseServices = async () => {
  const secrets = await getSecrets();

  const supabase = createClient(
    secrets.SUPABASE_URL,
    secrets.SUPABASE_KEY
  );

  return { supabase };
};

module.exports = supabaseServices;
