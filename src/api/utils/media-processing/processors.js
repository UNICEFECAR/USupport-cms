/**
 * What each processed media component produces from its uploaded source.
 * Keyed by component UID; every processor writes into its own fields.
 */
const fs = require("fs");
const path = require("path");
const {
  HLS_MASTER_PLAYLIST,
  runFfmpeg,
  buildHlsArgs,
  buildDownloadArgs,
  buildAudioArgs,
} = require("./ffmpeg");
const { uploadFile, uploadDirectory } = require("./storage");

// Fields written by the pipeline, never by editors (see index.js)
const COMMON_GENERATED_FIELDS = [
  "status",
  "error",
  "duration_seconds",
  "processed_source_id",
];

const PROCESSORS = {
  "shared.processed-video": {
    label: "video",
    storageFolder: "processed-videos",
    generatedFields: ["hls_url", "download_url", ...COMMON_GENERATED_FIELDS],

    /**
     * Adaptive HLS stream plus a 360p MP4 for downloads
     */
    async run({ inputPath, info, workDir, storagePath }) {
      if (!info.hasVideo) throw new Error("The uploaded file has no video stream.");

      const hlsDir = path.join(workDir, "hls");
      const downloadPath = path.join(workDir, "download.mp4");
      await fs.promises.mkdir(hlsDir);

      await runFfmpeg(buildHlsArgs(inputPath, info), hlsDir);
      await runFfmpeg(buildDownloadArgs(inputPath, info, downloadPath), workDir);

      const hlsUrls = await uploadDirectory(hlsDir, storagePath);
      return {
        hls_url: hlsUrls[HLS_MASTER_PLAYLIST],
        download_url: await uploadFile(downloadPath, storagePath),
      };
    },
  },

  "shared.processed-audio": {
    label: "audio",
    storageFolder: "processed-audios",
    generatedFields: ["audio_url", ...COMMON_GENERATED_FIELDS],

    /**
     * Small AAC file from any audio or video upload, streamed and downloaded
     */
    async run({ inputPath, info, workDir, storagePath }) {
      if (!info.hasAudio) throw new Error("The uploaded file has no audio stream.");

      const audioPath = path.join(workDir, "audio.m4a");
      await runFfmpeg(buildAudioArgs(inputPath, audioPath), workDir);

      return { audio_url: await uploadFile(audioPath, storagePath) };
    },
  },
};

module.exports = { PROCESSORS };
