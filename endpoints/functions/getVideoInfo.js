const ffmpeg = require("fluent-ffmpeg");
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
ffmpeg.setFfprobePath(ffprobePath);
ffmpeg.setFfmpegPath(require("ffmpeg-static"));

const getVideoInfo = async (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, info) => {
      if (err) {
        console.error("Failed to get video information:", err);
        reject(err);
      } else {
        const { width, height, r_frame_rate, bit_rate, codec_name, duration } = info.streams[0].coded_width > 0 ? info.streams[0] : info.streams[1];
        // console.log(info.streams[0].coded_width > 0 ? info.streams[0] : info.streams[1]);
        const [numerator, denominator] = r_frame_rate.split("/");
        const framerate = parseFloat(numerator) / parseFloat(denominator);
        // Extract the video bitrate in kilobits per second (kbps)
        const videoBitrateKbps = Math.round(bit_rate / 1000);
        resolve({ width, height, framerate, videoBitrateKbps, codec_name, duration });
      }
    });
  });
};

module.exports = getVideoInfo;
