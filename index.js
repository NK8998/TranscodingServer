const express = require("express");
const app = express();
const cors = require("cors");

app.options("*", cors());

app.use(
  cors({
    origin: "*",
    // credentials: true,
  })
);

app.use(express.json());
const multer = require("multer");
const generateMPDandUpload = require("./transcoder");
const upload = multer({ storage: multer.memoryStorage() });

app.get("/test", () => {
  res.status(200).json("okay to go");
});

app.post(
  "/transcode",
  upload.fields([{ name: "video", maxCount: 1 }]),
  generateMPDandUpload
);

app.listen("5573", () => {
  console.log("listening on port 5573");
});
