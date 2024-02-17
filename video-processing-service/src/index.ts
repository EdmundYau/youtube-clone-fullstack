import express from "express";
import { isVideoNew, setVideo } from "./firestore";
import {
  deleteProcessedVideo,
  deleteRawVideo,
  downloadRawVideo,
  setupDirectories,
  uploadProcessedVideo,
  convertVideo,
} from "./storage";

setupDirectories();

const app = express();
app.use(express.json());
//http get endpoint
app.post("/process-video", async (request, response) => {
  // Get the bucket and filename from the Cloud Pub/Sub message
  let data;
  try {
    const message = Buffer.from(request.body.message.data, "base64").toString(
      "utf8"
    );
    data = JSON.parse(message);
    if (!data.name) {
      throw new Error("Invalid message payload received.");
    }
  } catch (error) {
    console.error(error);
    return response.status(400).send("Bad Request: missing filename.");
  }

  const inputFileName = data.name; // format of <UID>-<DATE>.<EXTENSION>
  const outputFileName = `processed-${inputFileName}`;
  
  const videoId = inputFileName.split('.')[0];
  if(!isVideoNew(videoId)){
    return response.status(400).send("Bad Request: video already processing or processed.");
  }else {
    await setVideo(videoId, {
      id: videoId,
      uid: videoId.split('-')[0],
      status: 'processing'})
  }

  //Download the raw video from Cloud Storage
  await downloadRawVideo(inputFileName);

  // Convert the video to 360p
  try {
    await convertVideo(inputFileName, outputFileName);
  } catch (err) {
    await Promise.all([
      deleteRawVideo(inputFileName),
      deleteProcessedVideo(outputFileName),
    ]);

    console.error(err);
    return response
      .status(500)
      .send("Internal Server Error: video processing failed.");
  }

  //Upload the processed video to Cloud Storage
  await uploadProcessedVideo(outputFileName);

  await setVideo(videoId, {
    status: 'processed',
    filename: outputFileName
  });

  await Promise.all([
    deleteRawVideo(inputFileName),
    deleteProcessedVideo(outputFileName),
  ]);

  return response.status(200).send("Processing finished successfully");
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Video processing service listening at http://localhost:${port}`);
});
