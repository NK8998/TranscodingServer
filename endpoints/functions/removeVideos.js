const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const removeVideosFromQueue = async (videos) => {
  const deletePromises = videos.map((video) => {
    return supabase.from("video-queue").delete().eq("video_id", video.video_id);
  });

  const results = await Promise.all(deletePromises);
  const errors = results.filter((result) => result.error).map((result) => result.error);

  if (errors.length > 0) {
    console.error(`Errors occurred while deleting videos: ${errors}`);
  }
};

module.exports = removeVideosFromQueue;
