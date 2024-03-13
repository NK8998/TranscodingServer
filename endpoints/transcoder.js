// const { createClient } = require('@supabase/supabase-js');
const AWS = require("aws-sdk");
const fs = require("fs");
const os = require("os");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
ffmpeg.setFfprobePath(ffprobePath);
const checkPresets = require("./functions/checkPresets");
const getVideoInfo = require("./functions/getVideoInfo");
const uploadChunks = require("./functions/uploadToS3");
const getVideosInQueue = require("./functions/getVideos");
const removeVideosFromQueue = require("./functions/removeVideos");
const { isRunningFunction, isRunning, getPayload } = require("./functions/isRunning");
const getPreviews = require("./functions/extractFrames");
const getResolutions = require("./functions/getResolutions");
const uploadPalletes = require("./functions/uploadPalletes");
const adjustFrameExtraction = require("./functions/adjustFrameExtraction");

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
      let newRes = { ...resolution };

      //make sure framerate never exceeds 30 for resolution less than or equal to 480
      if (newRes.height <= 480) {
        newRes.framerate = newRes.framerate > 30 ? 30 : newRes.framerate;
      }
      if (!videoBitrateKbps) return newRes;

      const length = resolutions.length;
      const calculatedBitrate = Math.round(videoBitrateKbps - index * (videoBitrateKbps / length));

      // Update the bitrate if the current resolution bitrate is greater than the calculated bitrate
      if (resolution.bitrate > calculatedBitrate) {
        newRes = { ...newRes, bitrate: Math.min(resolution.bitrate, videoBitrateKbps, calculatedBitrate) };

        return newRes;
      }

      return newRes;
    });

    console.log(finalResolutions);

    // Create an FFmpeg command

    const generateMPDandChunks = () => {
      return new Promise((resolve, reject) => {
        const command = ffmpeg(videoPath)
          .addOption("-map 0:a:0") // Include audio stream from input
          .addOption("-c:a:0 aac") // Audio codec for all representations
          .addOption("-b:a:0 128k"); // Audio bitrate for all representations

        // Dynamically add video options for each resolution
        finalResolutions.forEach((resolution, index) => {
          command
            .addOption(`-map 0:v:0`)
            .addOption(`-c:v:${index} libx264`)
            .addOption(`-b:v:${index} ${resolution.bitrate}k`)
            .addOption(`-s:v:${index} ${resolution.width}x${resolution.height}`)
            .addOption(`-g:v:${index} ${resolution.framerate}`);
        });

        // Set the output manifest
        command.output(outputManifest);
        command.outputOptions([
          "-f dash", // Output format as DASH
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
        const folderName = `./folder-${video.video_id}`;
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
    const videoPath = await downloadVideo(video);
    const videoPathDir = path.dirname(videoPath);

    const videoInfo = await getVideoInfo(videoPath);
    console.log(videoInfo);

    const { width, height, framerate, duration, videoBitrateKbps } = videoInfo;

    const inputResolution = { width: width, height: height, framerate: framerate };

    const resolutions = getResolutions(inputResolution);
    console.log(resolutions);
    const priviewAdjustments = adjustFrameExtraction(duration);

    await getPreviews(videoPath, videoPathDir, resolutions, priviewAdjustments);

    await transcodeAndGenerateMpd(videoPath, videoPathDir, videoBitrateKbps, resolutions);

    const mpdUrl = await uploadChunks(videoPathDir, video.video_id);

    await uploadPalletes(videoPathDir, video.video_id);

    console.log(mpdUrl, video.video_id, duration);
    // upload to supabase
    fs.rmSync(videoPathDir, { recursive: true });
  } catch (error) {
    console.log(error);
  }
};

let interValId;
const setUpTranscodingJobs = async () => {
  console.log("running");
  isRunningFunction(true);

  queuedVideos = (await getVideosInQueue()) || [];

  if (queuedVideos.length === 0) {
    interValId = setInterval(() => {
      console.log("dummy task");
    }, 1000 * 60 * 60);
    return;
  }

  if (interValId) {
    clearInterval(interValId);
  }
  const transcodingPromises = queuedVideos.map((video) => {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await generateMPDandUpload(video);
        resolve(result);
      } catch (error) {
        console.error(`Error processing video ${video.video_id}: ${error}`);
        resolve(null); // Resolve with null on error
        // update the error field in video-metadata table and inform user.
      }
    });
  });
  await Promise.all(transcodingPromises);
  await removeVideosFromQueue(queuedVideos);

  setUpTranscodingJobs();
};
module.exports = setUpTranscodingJobs;
