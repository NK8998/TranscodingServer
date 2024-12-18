const supabaseServices = require("../SDKs/supabase");

const uploadToSupabase = async (
  video_id,
  resolutions,
  previewAdjustments,
  mpdUrl,
  paletteUrls,
  aspectRatio,
  duration,
  timestamp
) => {
  const { supabase } = await supabaseServices();
  console.log("uploading");
  try {
    const { data, error } = await supabase
      .from("video-metadata")
      .update([
        {
          resolutions: resolutions,
          extraction_and_palette: previewAdjustments,
          mpd_url: mpdUrl,
          palette_urls: paletteUrls,
          aspect_ratio: aspectRatio,
          duration: duration,
          duration_timestamp: timestamp,
          type:
            duration <= 60 && aspectRatio < 0.57
              ? "short"
              : "video",
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
