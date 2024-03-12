// Function to check which dimension of the input resolution matches the presets
function checkResolution(inputResolution, allResolutions) {
  let presetToChange = "none";

  // Loop over all presets
  for (let preset of allResolutions) {
    // If the width of the preset matches the width of the input resolution,
    // set presetToChange to "height"
    if (preset.width === inputResolution.width) {
      presetToChange = "height";
      break;
    }
    // If the height of the preset matches the height of the input resolution,
    // set presetToChange to "width"
    else if (preset.height === inputResolution.height) {
      presetToChange = "width";
      break;
    }
  }

  // Return which dimension to change
  return presetToChange;
}

// Function to calculate the aspect ratio of the input resolution
function calculateAspectRatio(inputResolution) {
  const aspectRatio = inputResolution.width / inputResolution.height;

  return aspectRatio;
}

// Function to filter the presets based on the dimension to change
function filterResolutions(inputResolution, allResolutions, presetToChange) {
  // If the dimension to change is "width" or "none",
  // filter the presets to include only those with a height less than or equal to the input height
  if (presetToChange === "width" || presetToChange === "none") {
    return allResolutions.filter((preset) => preset.height <= inputResolution.height);
  }
  // If the dimension to change is "height",
  // filter the presets to include only those with a width less than or equal to the input width
  else if (presetToChange === "height") {
    return allResolutions.filter((preset) => preset.width <= inputResolution.width);
  }
}

function roundToEven(value) {
  return value % 2 === 0 ? value : value - 1;
}

// Function to adjust the presets based on the dimension to change

function adjustPresets(inputResolution, allResolutions, presetToChange) {
  // Filter the presets
  const filteredResolutions = filterResolutions(inputResolution, allResolutions, presetToChange);
  // Calculate the aspect ratio
  const aspectRatio = calculateAspectRatio(inputResolution);

  // If the dimension to change is "width",
  // map over the filtered resolutions and change the widths according to the aspect ratio
  if (presetToChange === "width") {
    return filteredResolutions.map((preset) => {
      let newWidth = roundToEven(Math.round(preset.height * aspectRatio));
      return {
        width: newWidth,
        height: preset.height,
        bitrate: preset.bitrate,
        framerate: inputResolution.framerate,
        tag: preset.tag,
        supersript: preset.supersript,
      };
    });
  }
  // If the dimension to change is "height",
  // map over the filtered resolutions and change the heights according to the aspect ratio
  else if (presetToChange === "height") {
    return filteredResolutions.map((preset) => {
      let newHeight = roundToEven(Math.round(preset.width / aspectRatio));
      return {
        width: preset.width,
        height: newHeight,
        bitrate: preset.bitrate,
        framerate: inputResolution.framerate,
        tag: preset.tag,
        supersript: preset.supersript,
      };
    });
  }

  return filteredResolutions;
}

// Function to check the presets and adjust them if necessary
function checkPresets(inputResolution, allResolutions) {
  // Check which dimension of the input resolution matches the presets
  const presetToChange = checkResolution(inputResolution, allResolutions);

  let resolutions;
  // If neither dimension matches the presets, use special presets
  if (presetToChange === "none") {
    resolutions = useSpecialPresets(inputResolution, allResolutions, presetToChange);
    return resolutions;
  }

  // Otherwise, adjust the presets and log the result
  resolutions = adjustPresets(inputResolution, allResolutions, presetToChange);
  return resolutions;
}

// Function to use special presets when neither dimension of the input resolution matches the presets
function useSpecialPresets(inputResolution, allResolutions, presetToChange) {
  console.log("Using special presets");
  // Calculate the aspect ratio
  const aspectRatio = calculateAspectRatio(inputResolution);
  // Filter the presets
  const filteredResolutions = filterResolutions(inputResolution, allResolutions, presetToChange);
  // console.log(filteredResolutions);
  // Map over the filtered resolutions and adjust both dimensions according to the aspect ratio
  const specialResolutions = filteredResolutions.map((preset) => {
    return {
      width: roundToEven(Math.round(preset.height * aspectRatio)),
      height: roundToEven(Math.round(preset.width * aspectRatio)),
      bitrate: preset.bitrate,
      framerate: inputResolution.framerate,
      tag: preset.tag,
      supersript: preset.supersript,
    };
  });

  specialResolutions[0] = { ...specialResolutions[0], height: inputResolution.height, width: inputResolution.width };
  // Return the special resolutions
  return specialResolutions;
}

// // Define the input resolution and all possible resolutions

// let framerate = 24;
// let inputResolution = { width: 1552, height: 1080, framerate: framerate };
// const AllResolutions = [
//   { width: 3840, height: 2160, bitrate: 4000, framerate: framerate, tag: "2160p", supersript: "4k" },
//   { width: 2560, height: 1440, bitrate: 3000, framerate: framerate, tag: "1440p", supersript: "HD" },
//   { width: 1920, height: 1080, bitrate: 2500, framerate: framerate, tag: "1080p", supersript: "HD" },
//   { width: 1280, height: 720, bitrate: 2000, framerate: framerate, tag: "720p", supersript: "" },
//   { width: 854, height: 480, bitrate: 1000, framerate: framerate, tag: "480p", supersript: "" },
//   { width: 640, height: 360, bitrate: 800, framerate: framerate, tag: "360p", supersript: "" },
//   { width: 426, height: 240, bitrate: 400, framerate: framerate, tag: "240p", supersript: "" },
//   { width: 256, height: 144, bitrate: 200, framerate: framerate, tag: "144p", supersript: "" },
//   // Add more resolutions as needed
// ];

module.exports = checkPresets;
