const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const getVideosInQueue = async () => {
  const videosInQueue = supabase.from("video-queue").select("*").order("time_added", { ascending: true }).limit(5);

  const { data, error } = await videosInQueue;

  return data;
};

module.exports = getVideosInQueue;
