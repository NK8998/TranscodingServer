const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const uploadToSupabase = async (
  video_id,
  resolutions,
  previewAdjustments,
  mpdUrl,
  paletteUrls,
  possibleThumbnailsUrls,
  aspectRatio,
  duration,
  timestamp
) => {
  console.log("uploading");
  console.log(video_id, resolutions, previewAdjustments, mpdUrl, paletteUrls, possibleThumbnailsUrls, aspectRatio, duration, timestamp);

  try {
    const { data, error } = await supabase
      .from("video-metadata")
      .update([
        {
          resolutions: resolutions,
          extraction_and_palette: previewAdjustments,
          mpd_url: mpdUrl,
          palette_urls: paletteUrls,
          possible_thumbnail_urls: possibleThumbnailsUrls,
          aspect_ratio: aspectRatio,
          duration: duration,
          duration_timestamp: timestamp,
        },
      ])
      .eq("video_id", video_id)
      .select();

    if (error) {
      console.error("Error uploading to Supabase:", error);
      throw error;
    }

    console.log(data);
    return data;
  } catch (error) {
    console.error("Unexpected error occurred:", error);
    throw error;
  }
};

module.exports = uploadToSupabase;
