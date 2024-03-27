const AWS = require("aws-sdk");
const { retrieveInstanceId } = require("./getInstanceId");
const checkRunningInstances = require("./checkRunningInstances");
const { setUpTranscodingJobs } = require("../transcoder");
require("dotenv").config();
const ec2 = new AWS.EC2({ region: "ap-south-1" });

let retries = 0;

const terminateInstance = async (instanceId) => {
  const instanceData = await ec2.describeInstances({ InstanceIds: [instanceId] }).promise();
  const state = instanceData.Reservations[0].Instances[0].State.Name;

  if (state === "running") {
    await ec2.terminateInstances({ InstanceIds: [instanceId] }).promise();
    console.log(`Terminated instance: ${instanceId}`);
  } else {
    console.log(`Instance ${instanceId} is already in the desired state: ${state}`);
  }
};

const stopInstance = async (instanceId) => {
  const otherRunningInstancesExist = await checkRunningInstances();
  if (otherRunningInstancesExist) {
    setUpTranscodingJobs([]);
    return;
  }
  const instanceData = await ec2.describeInstances({ InstanceIds: [instanceId] }).promise();
  const state = instanceData.Reservations[0].Instances[0].State.Name;

  if (state === "running") {
    await ec2.stopInstances({ InstanceIds: [instanceId] }).promise();
    console.log(`Stopped instance: ${instanceId}`);
  } else {
    console.log(`Instance ${instanceId} is already in the desired state: ${state}`);
  }
};
const shutInstance = async () => {
  try {
    const thisInstanceId = retrieveInstanceId();
    const instanceId = process.env.INSTANCE_ID;
    if (instanceId !== thisInstanceId) {
      terminateInstance(thisInstanceId);
    } else {
      stopInstance(instanceId);
    }
  } catch (error) {
    retries++;
    console.error("Error stopping instance:", error);
    if (retries < 10) {
      shutInstance();
    }
  }
};

module.exports = shutInstance;
