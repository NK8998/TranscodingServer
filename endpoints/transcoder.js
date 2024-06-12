// const { createClient } = require('@supabase/supabase-js');
const AWS = require("aws-sdk");
const fs = require("fs");
const os = require("os");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
ffmpeg.setFfprobePath(ffprobePath);
const getVideoInfo = require("./functions/getVideoInfo");
const uploadChunks = require("./functions/uploadToS3");
const { isRunningFunction } = require("./functions/isRunning");
const getPreviews = require("./functions/extractFrames");
const { getResolutions, getAllResolutions } = require("./functions/getResolutions");
const uploadPalletes = require("./functions/uploadPalletes");
const adjustFrameExtraction = require("./functions/adjustFrameExtraction");
const extractThumbnails = require("./functions/extractThumbnails");
const uploadToSupabase = require("./functions/uploadToSupabase");
const getDurationStamp = require("./functions/getDurationStamp");
const shutInstance = require("./functions/shutInstace");
const transcodeDownloadables = require("./functions/transcodeDownloadables");

require("dotenv").config();
ffmpeg.setFfmpegPath(require("ffmpeg-static"));

AWS.config.update({ region: "ap-south-1" });

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  maxRetries: 10, // Maximum number of retry attempts for failed requests
  httpOptions: {
    timeout: 120000, // Request timeout in milliseconds
  },
});

const transcodeAndGenerateMpd = async (videoPath, videoPathDir, videoBitrateKbps, resolutions) => {
  try {
    const MpdOutput = `${videoPathDir}/MPDOutput`;
    fs.mkdirSync(MpdOutput, { recursive: true });
    const outputManifest = `${MpdOutput}/output.mpd`;
    // Check if the output folder exists, if not, create it
    const finalResolutions = resolutions.map((resolution, index) => {
      const length = resolutions.length;
      const calculatedBitrate = Math.round(videoBitrateKbps - index * (videoBitrateKbps / length));

      return {
        ...resolution,
        // Limit framerate to 30 for resolutions <= 480
        framerate: resolution.height <= 480 ? Math.min(resolution.framerate, 30) : resolution.framerate,
        // Update bitrate if necessary
        bitrate: Math.min(resolution.bitrate, videoBitrateKbps, calculatedBitrate),
      };
    });

    console.log(finalResolutions);

    // Create an FFmpeg command

    const generateMPDandChunks = () => {
      return new Promise((resolve, reject) => {
        const command = ffmpeg(videoPath)
          .addOption("-map 0:a:0") // Include audio stream from input
          .addOption("-q:a 2") // Same quality level for audio
          .audioCodec("libmp3lame");

        // Dynamically add video options for each resolution
        finalResolutions.forEach((resolution, index) => {
          command
            .addOption(`-map 0:v:0`)
            .addOption(`-c:v:${index} libx264`) // Use h264 codec for faster transcoding
            .addOption(`-b:v:${index} ${resolution.bitrate}k`)
            .addOption(`-s:v:${index} ${resolution.width}x${resolution.height}`)
            .addOption(`-g:v:${index} ${resolution.framerate}`);
        });

        // Set the output manifest
        command.output(outputManifest);
        command.outputOptions([
          "-crf 28",
          "-f dash", // Output format as DASH
          "-pix_fmt yuv420p",
          // '-single_file 1',
        ]);

        // Execute the FFmpeg command
        command
          .on("start", () => {
            console.log("Starting DASH transcoding...");
          })
          .on("progress", (progress) => {
            if (progress && progress.percent) {
              console.log(`Progress: ${progress.percent.toFixed(2)}%`);
            }
          })
          .on("error", (err, stdout, stderr) => {
            console.error("Error:", err.message);
            console.error("FFmpeg stdout:", stdout);
            console.error("FFmpeg stderr:", stderr);
            reject(err);
          })
          .on("end", () => {
            console.log("DASH transcoding completed.");
            resolve();
          })
          .run();
      });
    };

    await generateMPDandChunks();
  } catch (error) {
    console.error("something went wrong", error);
  }
};

const downloadVideo = async (video) => {
  console.log(video);
  const params = {
    Bucket: process.env.AWS_UNPROCESSED_BUCKET_NAME, // replace with your bucket name
    Key: video.video_id,
  };
  return new Promise((resolve, reject) => {
    s3.getObject(params, (err, data) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        const scriptDirectory = __dirname;
        const folderName = `./folder${video.video_id}`;
        if (!fs.existsSync(folderName)) {
          fs.mkdirSync(folderName, { recursive: true });
        }
        const videoPath = `${folderName}/${video.video_id}`;
        fs.writeFileSync(videoPath, data.Body);
        resolve(videoPath);
      }
    });
  });
};

const generateMPDandUpload = async (video) => {
  try {
    const video_id = video.video_id;
    const videoPath = await downloadVideo(video);
    const videoPathDir = path.dirname(videoPath);

    const videoInfo = await getVideoInfo(videoPath);
    console.log(videoInfo);

    const { width, height, framerate, duration, videoBitrateKbps } = videoInfo;

    const inputResolution = { width: width, height: height, framerate: framerate };

    const resolutions = getResolutions(inputResolution);

    const allResolutions = getAllResolutions(inputResolution); // for getting the correct pallete aspect ratio

    const previewAdjustments = adjustFrameExtraction(duration);

    await getPreviews(videoPath, videoPathDir, allResolutions, previewAdjustments, video_id);

    await extractThumbnails(videoPathDir, video_id);

    await transcodeAndGenerateMpd(videoPath, videoPathDir, videoBitrateKbps, resolutions);

    const mpdUrl = await uploadChunks(videoPathDir, video_id);

    const paletteUrls = await uploadPalletes(videoPathDir, video_id);

    const aspectRatio = Math.round((width / height) * 1000) / 1000;

    const timestamp = getDurationStamp(Math.round(duration));
    // upload to supabase

    await uploadToSupabase(video_id, resolutions, previewAdjustments, mpdUrl, paletteUrls, aspectRatio, duration, timestamp);

    await transcodeDownloadables(videoPath, videoPathDir, resolutions, video_id);
    fs.rmSync(videoPathDir, { recursive: true });
  } catch (error) {
    console.log(error);
  }
};

let interValId;
let timeoutId;

const setUpTranscodingJobs = async (data) => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  if (interValId) {
    clearInterval(interValId);
  }
  console.log("running");
  isRunningFunction(true);
  const { getCurrentJobs } = require("./functions/queueController");
  const currentJobs = getCurrentJobs();
  if (currentJobs.length === 0 && data.length === 0) {
    isRunningFunction(false);
    const { getInstanceId } = require("./functions/getInstanceId");
    const instance_id = await getInstanceId();
    console.log("idling");
    console.log(instance_id);
    timeoutId = setTimeout(() => {
      shutInstance();
    }, 1000 * 60 * 15);
    interValId = setInterval(() => {
      console.log("dummy task");
    }, 1000 * 60 * 60);
    return;
  }

  const setUpJob = async (video) => {
    try {
      await generateMPDandUpload(video);
      const { removeJob } = require("./functions/queueController");
      await removeJob(video);
    } catch (err) {
      console.error("Error in setUpJob for video:", video, "Error:", err);
      // Handle error appropriately here
    }
  };

  for (const video of data) {
    setUpJob(video);
  }

  // const transcodingPromises = queuedVideos.map((video) => {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       const result = await generateMPDandUpload(video);
  //       resolve(result);
  //     } catch (error) {
  //       console.error(`Error processing video ${video.video_id}: ${error}`);
  //       resolve(null); // Resolve with null on error
  //       // update the error field in video-metadata table and inform user.
  //     }
  //   });
  // });
  // await Promise.all(transcodingPromises);
  // await removeVideosFromQueue(queuedVideos);

  // setUpTranscodingJobs();
};

module.exports = { setUpTranscodingJobs, generateMPDandUpload };
