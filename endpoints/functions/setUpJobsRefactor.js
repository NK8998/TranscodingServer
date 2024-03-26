const { setUpTranscodingJobs } = require("../transcoder");

const setUpJobsRefactor = (data) => {
  setUpTranscodingJobs(data);
};

module.exports = setUpJobsRefactor;
