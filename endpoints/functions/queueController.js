const { setUpTranscodingJobs } = require("../transcoder");
const getVideosInQueue = require("./getVideos");
const removeVideosFromQueue = require("./removeVideos");

let internalQueue = [];
let currentJobs = [];
const MAXIMUM_CONCURRENT_JOBS = 5;

const updateInternalQueue = (data) => {
  internalQueue = [...internalQueue, data];
  if (currentJobs.length < 5) {
    addJob(data);
  }
};

const getInternalQueue = () => {
  return internalQueue;
};

const startJobs = async () => {
  const data = await getVideosInQueue();

  internalQueue = [...data];
  const firstFiveVideos = internalQueue.slice(0, MAXIMUM_CONCURRENT_JOBS);
  currentJobs = firstFiveVideos;
  //   internalQueue = internalQueue.filter((video) => !currentJobs.some((currentJob) => currentJob.video_id === video.video_id));

  setUpTranscodingJobs(firstFiveVideos);
  // get first five and set up transcoding tasks
};

function addJob(videoToAdd) {
  // Find a video in the queue that is not currently being transcoded

  if (videoToAdd) {
    // Add the new video to currentJobs
    currentJobs.push(videoToAdd);
  }

  // Set up a transcoding task for the video
  setUpTranscodingJobs(videoToAdd ? [videoToAdd] : []);
}

async function removeJob(videoToRemove) {
  // remove a task from the queue and add another one
  internalQueue = internalQueue.filter((task) => task.video_id === videoToRemove.video_id);
  const videoToAdd = internalQueue.find((video) => !currentJobs.some((currentJob) => currentJob.video_id === video.video_id));

  // remove done video from currentJobs
  currentJobs = currentJobs.filter((video) => video.video_id !== videoToRemove.video_id);
  await removeVideosFromQueue([videoToRemove]);

  addJob(videoToAdd);
}

module.exports = { updateInternalQueue, getInternalQueue, startJobs, removeJob };
