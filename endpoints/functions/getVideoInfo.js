const ffmpeg = require("fluent-ffmpeg");
const ffprobePath =
  require("@ffprobe-installer/ffprobe").path;
ffmpeg.setFfprobePath(ffprobePath);
ffmpeg.setFfmpegPath(require("ffmpeg-static"));
const { exec } = require("child_process");

const mergeObjects = (obj1, obj2) => {
  const result = { ...obj1 };
  for (const key in obj2) {
    if (obj2[key] !== null && obj2[key] !== undefined) {
      result[key] = obj2[key];
    }
  }
  return result;
};
const getVideoInfo = async (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, async (err, info) => {
      if (err) {
        console.error(
          "Failed to get video information:",
          err
        );
        reject(err);
      } else {
        const {
          width,
          height,
          r_frame_rate,
          bit_rate,
          codec_name,
          duration,
        } =
          info.streams[0].coded_width > 0
            ? info.streams[0]
            : info.streams[1];
        const [numerator, denominator] =
          r_frame_rate.split("/");
        const framerate =
          parseFloat(numerator) / parseFloat(denominator);
        // Extract the video bitrate in kilobits per second (kbps)
        const videoBitrateKbps = Math.round(
          bit_rate / 1000
        );
        const probeInfoObj = {
          width,
          height,
          framerate,
          videoBitrateKbps,
          codec_name,
          duration,
        };
        const ffmpegInfoObj = await runFfmpegCommand(
          videoPath
        );

        // Merge the two objects
        const mergedInfoObj = mergeObjects(
          probeInfoObj,
          ffmpegInfoObj
        );

        resolve(mergedInfoObj);
      }
    });
  });
};

const convertToSeconds = (duration) => {
  const parts = duration.split(":");
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
};

const runFfmpegCommand = async (videoPath) => {
  const command = `ffmpeg -i ${videoPath}`;

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (
        error &&
        !error.message.includes(
          "At least one output file must be specified"
        )
      ) {
        console.error(`Unexpected exec error: ${error}`);
        reject(error);
        return;
      }

      // The metadata is contained in the stderr output
      const metadata = stderr;

      // Use regex to extract the metadata for each stream
      const titleRegex = /title\s*:\s*(.*)/;
      const durationRegex = /Duration: (.*?),/;
      const bitrateRegex = /bitrate: (.*?) kb\/s/;
      const streamRegex =
        /Stream #(\d:\d)([\s\S]*?)(?=(Stream #|Input #|$))/g;

      const titleMatch = metadata.match(titleRegex);
      const durationMatch = metadata.match(durationRegex);
      const bitrateMatch = metadata.match(bitrateRegex);

      const title = titleMatch ? titleMatch[1] : null;
      const stamp_duration = durationMatch
        ? durationMatch[1]
        : null;
      const bitrate = bitrateMatch ? bitrateMatch[1] : null;

      let match;
      const streams = [];

      while (
        (match = streamRegex.exec(metadata)) !== null
      ) {
        const streamInfo = match[2];
        const codecNameRegex =
          /: Video: (\w+)|: Audio: (\w+)/;
        const framerateRegex = /, (\d+(?:\.\d+)?) fps,/;
        const dimensionsRegex = /, (\d+x\d+),/;
        const codecNameMatch =
          streamInfo.match(codecNameRegex);
        const framerateMatch =
          streamInfo.match(framerateRegex);
        const dimensionsMatch =
          streamInfo.match(dimensionsRegex);
        const codec_name = codecNameMatch
          ? codecNameMatch[1] || codecNameMatch[2]
          : null;
        const s_framerate = framerateMatch
          ? framerateMatch[1]
          : null;
        const dimensions = dimensionsMatch
          ? dimensionsMatch[1]
          : null;

        streams.push({
          codec_name,
          s_framerate,
          dimensions,
        });
      }

      const availableInfo = streams.find(
        (info) =>
          info.dimensions || info.s_framerate !== null
      );
      const { codec_name, s_framerate, dimensions } =
        availableInfo;
      let s_width;
      let s_height;
      if (dimensions && dimensions.length > 0) {
        [s_width, s_height] = dimensions.split("x");
      }
      const duration = convertToSeconds(stamp_duration);
      const videoBitrateKbps = parseInt(bitrate);
      const framerate = parseFloat(s_framerate);
      const width = parseInt(s_width) || null;
      const height = parseInt(s_height) || null;
      resolve({
        width,
        height,
        framerate,
        videoBitrateKbps,
        codec_name,
        duration,
      });
    });
  });
};

module.exports = getVideoInfo;
