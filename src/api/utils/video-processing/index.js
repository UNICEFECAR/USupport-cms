/**
 * Video processing for the `shared.processed-video` component.
 *
 * When an editor uploads a source video, the entry's lifecycle queues the
 * component. Videos are processed one at a time inside the CMS process:
 * download -> HLS + MP4 via ffmpeg -> upload to S3 -> write the URLs back.
 * The component status is the source of truth, so anything left pending or
 * processing after a restart is picked up again on bootstrap.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  HLS_MASTER_PLAYLIST,
  probe,
  runFfmpeg,
  buildHlsArgs,
  buildDownloadArgs,
} = require("./ffmpeg");
const { downloadFile, uploadFile, uploadDirectory } = require("./storage");

const COMPONENT_UID = "shared.processed-video";
const STORAGE_FOLDER = "processed-videos";
const DOWNLOAD_FILE_NAME = "download.mp4";

const STATUS = Object.freeze({
  PENDING: "pending",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
});

const queue = [];
let isRunning = false;

const updateVideo = (id, data) =>
  strapi.db.query(COMPONENT_UID).update({ where: { id }, data });

const findVideo = (id) =>
  strapi.db.query(COMPONENT_UID).findOne({ where: { id }, populate: { source: true } });

/**
 * Transcode one component's source video and store the result on it.
 *
 * @param {number} id - component id
 */
async function processVideo(id) {
  const video = await findVideo(id);
  if (!video?.source) return;

  const { source } = video;
  await updateVideo(id, { status: STATUS.PROCESSING, error: null });

  const workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "video-"));

  try {
    const inputPath = path.join(workDir, `source${source.ext}`);
    const hlsDir = path.join(workDir, "hls");
    const downloadPath = path.join(workDir, DOWNLOAD_FILE_NAME);
    await fs.promises.mkdir(hlsDir);

    await downloadFile(source.url, inputPath);
    const info = await probe(inputPath);

    await runFfmpeg(buildHlsArgs(inputPath, info), hlsDir);
    await runFfmpeg(buildDownloadArgs(inputPath, info, downloadPath), workDir);

    // One folder per source file, so a replaced video never overwrites a live one
    const storagePath = `${STORAGE_FOLDER}/${source.hash}`;
    const hlsUrls = await uploadDirectory(hlsDir, storagePath);
    const downloadUrl = await uploadFile(downloadPath, storagePath);

    // The editor may have replaced the source while this one was processing
    const current = await findVideo(id);
    if (current?.processed_source_id !== source.id) return;

    await updateVideo(id, {
      status: STATUS.READY,
      hls_url: hlsUrls[HLS_MASTER_PLAYLIST],
      download_url: downloadUrl,
      duration_seconds: info.durationSeconds,
      error: null,
    });
    strapi.log.info(`Video ${source.name} processed: ${hlsUrls[HLS_MASTER_PLAYLIST]}`);
  } catch (err) {
    strapi.log.error(`Processing video ${source.name} failed: ${err.message}`);
    await updateVideo(id, { status: STATUS.FAILED, error: err.message.slice(0, 2000) });
  } finally {
    await fs.promises.rm(workDir, { recursive: true, force: true });
  }
}

async function processQueue() {
  if (isRunning) return;
  isRunning = true;

  while (queue.length) {
    const id = queue.shift();
    try {
      await processVideo(id);
    } catch (err) {
      strapi.log.error(`Video processing queue error: ${err.message}`);
    }
  }

  isRunning = false;
}

function enqueue(id) {
  if (!queue.includes(id)) queue.push(id);
  processQueue();
}

/**
 * Lifecycles that queue the video of `field` whenever a new source is
 * uploaded. Spread them into a content type's lifecycles.js.
 *
 * @param {string} uid - content type UID
 * @param {string} field - attribute holding a `shared.processed-video` component
 * @returns {{afterCreate: function, afterUpdate: function}}
 */
function createVideoProcessingLifecycles(uid, field) {
  async function queueNewSource(event) {
    const id = event.result?.id;
    if (!id) return;

    const entry = await strapi.entityService.findOne(uid, id, {
      populate: { [field]: { populate: ["source"] } },
    });
    const video = entry?.[field];

    // processed_source_id is set when queueing, so our own updates don't re-queue
    if (!video?.source || video.source.id === video.processed_source_id) return;

    await updateVideo(video.id, {
      status: STATUS.PENDING,
      processed_source_id: video.source.id,
      error: null,
    });
    enqueue(video.id);
  }

  return {
    afterCreate: queueNewSource,
    afterUpdate: queueNewSource,
  };
}

/**
 * Re-queue videos interrupted by a restart. Call from bootstrap.
 */
async function resumeVideoProcessing() {
  const videos = await strapi.db.query(COMPONENT_UID).findMany({
    select: ["id"],
    where: { status: { $in: [STATUS.PENDING, STATUS.PROCESSING] } },
  });

  if (videos.length) {
    strapi.log.info(`Resuming processing of ${videos.length} video(s)`);
  }
  videos.forEach(({ id }) => enqueue(id));
}

module.exports = {
  STATUS,
  createVideoProcessingLifecycles,
  resumeVideoProcessing,
};
