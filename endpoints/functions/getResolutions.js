const { checkPresets } = require("./checkPresets");

const getResolutions = (inputResolution) => {
  // Resolutions presets to include in the DASH manifest
  const specialPresets = [
    {
      width: 3840,
      height: 2160,
      bitrate: 6000,
      tag: "2160p",
      supersript: "4k",
      framerate: inputResolution.framerate,
      referenceHeight: 2160,
    },
    {
      width: 2560,
      height: 1440,
      bitrate: 5000,
      tag: "1440p",
      supersript: "HD",
      framerate: inputResolution.framerate,
      referenceHeight: 1440,
    },
    {
      width: 1920,
      height: 1080,
      bitrate: 3500,
      tag: "1080p",
      supersript: "HD",
      framerate: inputResolution.framerate,
      referenceHeight: 1080,
    },
    {
      width: 1280,
      height: 720,
      bitrate: 2500,
      tag: "720p",
      supersript: "",
      framerate: inputResolution.framerate,
      referenceHeight: 720,
    },
    {
      width: 854,
      height: 480,
      bitrate: 1500,
      tag: "480p",
      supersript: "",
      framerate:
        inputResolution.framerate > 30
          ? 30
          : inputResolution.framerate,
      referenceHeight: 480,
    },
    {
      width: 640,
      height: 360,
      bitrate: 1000,
      tag: "360p",
      supersript: "",
      framerate:
        inputResolution.framerate > 30
          ? 30
          : inputResolution.framerate,
      referenceHeight: 360,
    },
    {
      width: 426,
      height: 240,
      bitrate: 500,
      tag: "240p",
      supersript: "",
      framerate:
        inputResolution.framerate > 30
          ? 30
          : inputResolution.framerate,
      referenceHeight: 240,
    },
    {
      width: 256,
      height: 144,
      bitrate: 250,
      tag: "144p",
      supersript: "",
      framerate:
        inputResolution.framerate > 30
          ? 30
          : inputResolution.framerate,
      referenceHeight: 144,
    },
    // Add more resolutions as needed
  ];
  let resolutions = checkPresets(
    inputResolution,
    specialPresets
  );
  // High res is anything like 1440p and above
  const hasHighRes = resolutions.find(
    (res) => res.referenceHeight > 1080
  );
  if (!hasHighRes) {
    resolutions = resolutions.filter(
      (res) =>
        res.referenceHeight !== 480 &&
        res.referenceHeight !== 240
    );
  }
  return resolutions;
};

const getAllResolutions = (inputResolution) => {
  const specialPresets = [
    {
      width: 3840,
      height: 2160,
      bitrate: 4000,
      tag: "2160p",
      supersript: "4k",
      referenceHeight: 2160,
    },
    {
      width: 2560,
      height: 1440,
      bitrate: 3000,
      tag: "1440p",
      supersript: "HD",
      referenceHeight: 1440,
    },
    {
      width: 1920,
      height: 1080,
      bitrate: 2500,
      tag: "1080p",
      supersript: "HD",
      referenceHeight: 1080,
    },
    {
      width: 1280,
      height: 720,
      bitrate: 2000,
      tag: "720p",
      supersript: "",
      referenceHeight: 720,
    },
    {
      width: 854,
      height: 480,
      bitrate: 1000,
      tag: "480p",
      supersript: "",
      referenceHeight: 480,
    },
    {
      width: 640,
      height: 360,
      bitrate: 800,
      tag: "360p",
      supersript: "",
      referenceHeight: 360,
    },
    {
      width: 426,
      height: 240,
      bitrate: 400,
      tag: "240p",
      supersript: "",
      referenceHeight: 240,
    },
    {
      width: 256,
      height: 144,
      bitrate: 200,
      tag: "144p",
      supersript: "",
      referenceHeight: 144,
    },
    // Add more resolutions as needed
  ];
  const resolutions = checkPresets(
    inputResolution,
    specialPresets
  );
  return resolutions;
};

module.exports = { getResolutions, getAllResolutions };
