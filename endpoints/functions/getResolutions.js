const { checkPresets } = require("./checkPresets");

const getResolutions = (inputResolution) => {
  // Resolutions presets to include in the DASH manifest
  const AllResolutions = [
    { width: 3840, height: 2160, bitrate: 4000, tag: "2160p", supersript: "4k", framerate: inputResolution.framerate },
    { width: 2560, height: 1440, bitrate: 3000, tag: "1440p", supersript: "HD", framerate: inputResolution.framerate },
    { width: 1920, height: 1080, bitrate: 2500, tag: "1080p", supersript: "HD", framerate: inputResolution.framerate },
    { width: 1280, height: 720, bitrate: 2000, tag: "720p", supersript: "", framerate: inputResolution.framerate },
    // { width: 854, height: 480, bitrate: 1000, tag: "480p", supersript: "", framerate: inputResolution.framerate > 30 ? 30 : inputResolution.framerate  },
    {
      width: 640,
      height: 360,
      bitrate: 800,
      tag: "360p",
      supersript: "",
      framerate: inputResolution.framerate > 30 ? 30 : inputResolution.framerate,
    },
    // { width: 426, height: 240, bitrate: 400, tag: "240p", supersript: "", framerate: inputResolution.framerate > 30 ? 30 : inputResolution.framerate  },
    {
      width: 256,
      height: 144,
      bitrate: 200,
      tag: "144p",
      supersript: "",
      framerate: inputResolution.framerate > 30 ? 30 : inputResolution.framerate,
    },
    // Add more resolutions as needed
  ];
  const resolutions = checkPresets(inputResolution, AllResolutions);
  return resolutions;
};

const getAllResolutions = (inputResolution) => {
  const AllResolutions = [
    { width: 3840, height: 2160, bitrate: 4000, tag: "2160p", supersript: "4k" },
    { width: 2560, height: 1440, bitrate: 3000, tag: "1440p", supersript: "HD" },
    { width: 1920, height: 1080, bitrate: 2500, tag: "1080p", supersript: "HD" },
    { width: 1280, height: 720, bitrate: 2000, tag: "720p", supersript: "" },
    { width: 854, height: 480, bitrate: 1000, tag: "480p", supersript: "" },
    { width: 640, height: 360, bitrate: 800, tag: "360p", supersript: "" },
    { width: 426, height: 240, bitrate: 400, tag: "240p", supersript: "" },
    { width: 256, height: 144, bitrate: 200, tag: "144p", supersript: "" },
    // Add more resolutions as needed
  ];
  const resolutions = checkPresets(inputResolution, AllResolutions);
  return resolutions;
};

module.exports = { getResolutions, getAllResolutions };
