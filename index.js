const { getIsRunning } = require("./endpoints/functions/isRunning");
const setUpTranscodingJobs = require("./endpoints/transcoder");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

supabase
  .from("video-queue")
  .on("INSERT", (payload) => {
    console.log("Change received!", payload);
    const isRunning = getIsRunning();
    if (!isRunning) {
      setUpTranscodingJobs();
    }
  })
  .subscribe();

setUpTranscodingJobs();
