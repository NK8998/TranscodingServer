const { createClient } = require("@supabase/supabase-js");
const { updateInternalQueue, startJobs } = require("./endpoints/functions/queueController");
require("dotenv").config();

const maxStartupDelay = 1000;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const subscribeToSupabase = new Promise((resolve, reject) => {
  const randomDelay = Math.floor(Math.random() * maxStartupDelay);
  console.log(randomDelay);
  setTimeout(() => {
    supabase
      .channel("room1")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "video-queue" }, (payload) => {
        console.log("Change received!", payload);
        updateInternalQueue(payload.new);
      })
      .subscribe();
    resolve();
  }, randomDelay);
});

async function startInstaceJob() {
  await subscribeToSupabase;
  startJobs();
}

startInstaceJob();

// git clone https://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@github.com/NK8998/TranscodingServer

// token = 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;
