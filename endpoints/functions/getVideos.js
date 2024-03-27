const { createClient } = require("@supabase/supabase-js");
const { retrieveInstanceId } = require("./getInstanceId");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const getVideosInQueue = async () => {
  const instanceId = retrieveInstanceId();

  const videosInQueue = supabase
    .from("video-queue")
    .select("*")
    .eq("state", "unprocessed")
    .eq("instance_id", instanceId) // Add this line
    .order("time_added", { ascending: true });

  const { data, error } = await videosInQueue;

  return data;
};

module.exports = getVideosInQueue;
