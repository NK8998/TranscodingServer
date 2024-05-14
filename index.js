const { createClient } = require("@supabase/supabase-js");
const { updateInternalQueue, startJobs } = require("./endpoints/functions/queueController");
require("dotenv").config();

const maxStartupDelay = 1000;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const subscribeToSupabase = new Promise(async (resolve, reject) => {
  const { getInstanceId } = require("./endpoints/functions/getInstanceId");
  const instance_id = await getInstanceId();
  console.log({ first: instance_id });
  const randomDelay = Math.floor(Math.random() * maxStartupDelay);
  console.log(randomDelay);
  setTimeout(() => {
    supabase
      .channel(`${instance_id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "video-queue" }, (payload) => {
        console.log("Change received!", payload);
        updateInternalQueue(payload.new);
      })
      .subscribe();
    resolve();
  }, randomDelay);
});

async function startInstaceJob() {
  const { getInstanceId } = require("./endpoints/functions/getInstanceId");
  await getInstanceId();
  await subscribeToSupabase;
  startJobs();
}

startInstaceJob();

// git clone https://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@github.com/NK8998/TranscodingServer

// token = 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;

// live streaming code.
// const express = require("express");
// const socketio = require(" socket.io");
// const http = require("http");
// const app = express();
// const server = http.createServer(app);
// const io = socketio(server);

//     const generateMPDandChunks = (inputStream) => {
//       return new Promise((resolve, reject) => {
//         const command = ffmpeg(inputStream)
//           .inputFormat("mjpeg") // or whatever format your input stream is in
//           .addOption("-map 0:a:0") // Include audio stream from input
//           .addOption("-c:a:0 aac") // Audio codec for all representations
//           .addOption("-b:a:0 128k"); // Audio bitrate for all representations

//         // Dynamically add video options for each resolution
//         finalResolutions.forEach((resolution, index) => {
//           command
//             .addOption(`-map 0:v:0`)
//             .addOption(`-c:v:${index} libx264`)
//             .addOption(`-b:v:${index} ${resolution.bitrate}k`)
//             .addOption(`-s:v:${index} ${resolution.width}x${resolution.height}`)
//             .addOption(`-g:v:${index} ${resolution.framerate}`);
//         });

//         // Set the output manifest
//         command.output(outputManifest);
//         command.outputOptions([
//           "-f dash", // Output format as DASH
//           // '-single_file 1',
//         ]);

//         // Execute the FFmpeg command
//         command
//           .on("start", () => {
//             console.log("Starting DASH transcoding...");
//           })
//           .on("progress", (progress) => {
//             if (progress && progress.percent) {
//               console.log(`Progress: ${progress.percent.toFixed(2)}%`);
//             }
//           })
//           .on("error", (err, stdout, stderr) => {
//             console.error("Error:", err.message);
//             console.error("FFmpeg stdout:", stdout);
//             console.error("FFmpeg stderr:", stderr);
//             reject(err);
//           })
//           .on("end", () => {
//             console.log("DASH transcoding completed.");
//             resolve();
//           })
//           .run();
//       });
//     };

//     // periodically upload the chunks as they are transcoded and the updated manifest file

// const stream = require("stream");
// const ffmpeg = require("fluent-ffmpeg");

// io.on("connection", (socket) => {
//   let passThrough = new stream.PassThrough();

//   socket.on("stream", (data) => {
//     // Write data to the PassThrough stream
//     passThrough.write(data);

//     // Pass the PassThrough stream to ffmpeg
//     generateMPDandChunks(passThrough);
//   });

//   socket.on("end", () => {
//     // End the PassThrough stream when the WebSocket stream ends
//     passThrough.end();
//   });
// });
