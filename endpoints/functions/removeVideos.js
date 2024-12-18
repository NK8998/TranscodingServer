const supabaseServices = require("../SDKs/supabase");
require("dotenv").config();

const removeVideosFromQueue = async (videos) => {
  const { supabase } = await supabaseServices();
  const deletePromises = videos.map((video) => {
    return supabase
      .from("video-queue")
      .delete()
      .eq("video_id", video.video_id);
  });

  const results = await Promise.all(deletePromises);
  const errors = results
    .filter((result) => result.error)
    .map((result) => result.error);

  if (errors.length > 0) {
    console.error(
      `Errors occurred while deleting videos: ${errors}`
    );
  }
};

module.exports = removeVideosFromQueue;
