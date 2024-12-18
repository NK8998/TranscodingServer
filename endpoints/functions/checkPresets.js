// Function to check which dimension of the input resolution matches the presets
function checkResolution(inputResolution, specialPresets) {
  let presetToChange = "none";

  // Loop over all presets
  for (let preset of specialPresets) {
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
  const aspectRatio =
    inputResolution.width / inputResolution.height;

  return aspectRatio;
}

// Function to filter the presets based on the dimension to change
function filterResolutions(
  inputResolution,
  specialPresets,
  presetToChange
) {
  // If the dimension to change is "width" or "none",
  // filter the presets to include only those with a height less than or equal to the input height
  if (
    presetToChange === "width" ||
    presetToChange === "none"
  ) {
    return specialPresets.filter(
      (preset) => preset.height <= inputResolution.height
    );
  }
  // If the dimension to change is "height",
  // filter the presets to include only those with a width less than or equal to the input width
  else if (presetToChange === "height") {
    return specialPresets.filter(
      (preset) => preset.width <= inputResolution.width
    );
  }
}

function roundToEven(value) {
  return value % 2 === 0 ? value : value - 1;
}

function useSpecialPresets(
  inputResolution,
  specialPresets,
  presetToChange
) {
  // Calculate the aspect ratio
  const aspectRatio = calculateAspectRatio(inputResolution);
  // Filter the presets
  const filteredResolutions = filterResolutions(
    inputResolution,
    specialPresets,
    presetToChange
  );
  // Map over the filtered resolutions and adjust both dimensions according to the aspect ratio
  // console.log(filteredResolutions);
  const specialResolutions = filteredResolutions.map(
    (preset) => {
      // Think in terms of a container and we want to make the resolution fit inside the preset's dimensions
      let newHeight = Math.floor(
        preset.width * aspectRatio
      );
      let newWidth = Math.floor(newHeight * aspectRatio);

      if (newWidth > preset.width) {
        // If it exceeds then we simply set it equal to its width
        newWidth = preset.width;
        newHeight = Math.floor(newWidth / aspectRatio);
      }
      return {
        width: roundToEven(newWidth),
        height: roundToEven(newHeight),
        bitrate: preset.bitrate,
        framerate: preset.framerate,
        tag: preset.tag,
        supersript: preset.supersript,
        referenceHeight: preset.referenceHeight,
      };
    }
  );

  return specialResolutions;
}

// Function to check the presets and adjust them
function checkPresets(inputResolution, specialPresets) {
  // Check which dimension of the input resolution matches the presets
  const presetToChange = checkResolution(
    inputResolution,
    specialPresets
  );

  const resolutions = useSpecialPresets(
    inputResolution,
    specialPresets,
    presetToChange
  );
  return resolutions;
}

// Define the input resolution and all possible resolutions

module.exports = { checkPresets, roundToEven };
