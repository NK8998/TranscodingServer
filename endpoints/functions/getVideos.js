const { retrieveInstanceId } = require("./getInstanceId");
require("dotenv").config();
const supabaseServices = require("../SDKs/supabase");

const getVideosInQueue = async () => {
  const { supabase } = await supabaseServices();
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
