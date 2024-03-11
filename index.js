const { getIsRunning } = require("./endpoints/functions/isRunning");
const setUpTranscodingJobs = require("./endpoints/transcoder");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const channel = supabase
  .channel("video-queue")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
    },
    (payload) => {
      const isRunning = getIsRunning();
      if (!isRunning) {
        console.log("guess what I fucking ran anyway!!!");
        setUpTranscodingJobs();
      }
      console.log(payload);
    }
  )
  .subscribe();

setUpTranscodingJobs();

// git clone https://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@github.com/NK8998/TranscodingServer

// token = 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;
