const { setUpTranscodingJobs } = require("../transcoder");
const {
  retrieveInstanceId,
  getEnvironment,
} = require("./getInstanceId");
const getVideosInQueue = require("./getVideos");
const removeVideosFromQueue = require("./removeVideos");
const supabaseServices = require("../SDKs/supabase");
require("dotenv").config();
const environment = getEnvironment();

let internalQueue = [];
let currentJobs = [];
const MAXIMUM_CONCURRENT_JOBS = 5;

const updateInternalQueue = (data) => {
  const instanceId = retrieveInstanceId();
  if (data.instance_id !== instanceId) return;
  // check if this video belongs to this instance before adding it to queue
  internalQueue = [...internalQueue, data];
  if (currentJobs.length < 5) {
    addJob(data);
  }
};

const getCurrentJobs = () => {
  return currentJobs;
};

const startJobs = async () => {
  if (environment === "dev") {
    currentJobs.push(...internalQueue);
    setUpTranscodingJobs(internalQueue);
    console.log(internalQueue, "setting up jobs");
    return;
  }
  const data = await getVideosInQueue();

  internalQueue = [...data];
  const firstFiveVideos = internalQueue.slice(
    0,
    MAXIMUM_CONCURRENT_JOBS
  );
  //   internalQueue = internalQueue.filter((video) => !currentJobs.some((currentJob) => currentJob.video_id === video.video_id));

  for (const video of firstFiveVideos) {
    addJob(video);
  }
  if (firstFiveVideos.length === 0) {
    setUpTranscodingJobs([]);
  }

  // get first five and set up transcoding tasks
};

async function addJob(videoToAdd) {
  // Find a video in the queue that is not currently being transcoded

  if (videoToAdd) {
    // Add the new video to currentJobs
    currentJobs.push(videoToAdd);

    const { supabase } = await supabaseServices();

    // Update the state of the video to "processing"
    const { error: updateError } = await supabase
      .from("video-queue")
      .update({ state: "processing" })
      .eq("video_id", videoToAdd.video_id);
    if (updateError) {
      console.error(
        "Error updating video state: ",
        updateError
      );
      return;
    }
  }

  // Set up a transcoding task for the video
  setUpTranscodingJobs(videoToAdd ? [videoToAdd] : []);
}

// async function retrieveNewVideo() {
//   const instanceId = retrieveInstanceId();

//   // Retrieve the video specific to this instance
//   const { data: videos, error } = await supabase
//     .from("video-queue")
//     .select("*")
//     .eq("state", "unprocessed")
//     .eq("instance_id", instanceId) // Add this line
//     .order("time_added", { ascending: true })
//     .limit(1);
//   if (error) {
//     console.error("Error retrieving video: ", error);
//     return;
//   }
//   // Check if a video was retrieved
//   if (videos.length > 0) {
//     const video = videos[0];
//     return video;
//   }
// }

async function removeJob(videoToRemove) {
  // remove a task from the queue and add another one
  internalQueue = internalQueue.filter(
    (task) => task.video_id === videoToRemove.video_id
  );
  const videoToAdd = internalQueue.find(
    (video) =>
      !currentJobs.some(
        (currentJob) =>
          currentJob.video_id === video.video_id
      )
  );

  // remove done video from currentJobs
  currentJobs = currentJobs.filter(
    (video) => video.video_id !== videoToRemove.video_id
  );
  await removeVideosFromQueue([videoToRemove]);

  addJob(videoToAdd);
}

module.exports = {
  updateInternalQueue,
  getCurrentJobs,
  startJobs,
  removeJob,
};
