const { getIsRunning, updatePayload } = require("./endpoints/functions/isRunning");
const { createClient } = require("@supabase/supabase-js");
const { updateInternalQueue, startJobs } = require("./endpoints/functions/queueController");
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
      console.log("guess what I fucking ran anyway!!!");
      // setUpTranscodingJobs();
      console.log(payload.new);
      updateInternalQueue(payload.new);
    }
  )
  .subscribe();

startJobs();

// git clone https://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@github.com/NK8998/TranscodingServer

// token = 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;
