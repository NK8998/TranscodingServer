const AWS = require("aws-sdk");
const checkRunningInstances = require("./checkRunningInstances");
const { setUpTranscodingJobs } = require("../transcoder");
const getSecrets = require("../secrets/secrets");
const AWSServices = require("../SDKs/AWS");
require("dotenv").config();

let retries = 0;

const terminateInstance = async (instanceId) => {
  const { ec2 } = await AWSServices();

  const instanceData = await ec2
    .describeInstances({ InstanceIds: [instanceId] })
    .promise();
  const state =
    instanceData.Reservations[0].Instances[0].State.Name;

  if (state === "running") {
    await ec2
      .terminateInstances({ InstanceIds: [instanceId] })
      .promise();
    console.log(`Terminated instance: ${instanceId}`);
  } else {
    console.log(
      `Instance ${instanceId} is already in the desired state: ${state}`
    );
  }
};

const stopInstance = async (instanceId) => {
  const { ec2 } = await AWSServices();

  const otherRunningInstancesExist =
    await checkRunningInstances();
  if (otherRunningInstancesExist) {
    setUpTranscodingJobs([]);
    return;
  }
  const instanceData = await ec2
    .describeInstances({ InstanceIds: [instanceId] })
    .promise();
  const state =
    instanceData.Reservations[0].Instances[0].State.Name;

  if (state === "running") {
    await ec2
      .stopInstances({ InstanceIds: [instanceId] })
      .promise();
    console.log(`Stopped instance: ${instanceId}`);
  } else {
    console.log(
      `Instance ${instanceId} is already in the desired state: ${state}`
    );
  }
};
const shutInstance = async () => {
  const secrets = await getSecrets();

  try {
    const { getInstanceId } = require("./getInstanceId");
    const thisInstanceId = await getInstanceId();
    const instanceId = secrets.AWS_ORIGINAL_INSTANCE_ID;
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
