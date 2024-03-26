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
        framerate: preset.framerate,
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
        framerate: preset.framerate,
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
      framerate: preset.framerate,
      tag: preset.tag,
      supersript: preset.supersript,
    };
  });

  specialResolutions[0] = { ...specialResolutions[0], height: inputResolution.height, width: inputResolution.width };
  // Return the special resolutions
  return specialResolutions;
}

// Define the input resolution and all possible resolutions

module.exports = { checkPresets, roundToEven };
