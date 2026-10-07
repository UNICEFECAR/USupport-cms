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

// Video renditions for audio uploads that come with a picture
const AUDIO_VIDEO_HEIGHTS = [360, 720];

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
    generatedFields: ["audio_url", "video_hls_url", "has_video", ...COMMON_GENERATED_FIELDS],
    // Audios processed before the video version existed are processed again once
    backfillWhere: { status: "ready", has_video: { $null: true } },

    /**
     * Small AAC file from any audio or video upload, streamed and downloaded.
     * When the upload has a picture (e.g. an .mp4 with a title card) it also
     * gets a light HLS video, so the page can play it with its visuals.
     */
    async run({ inputPath, info, workDir, storagePath }) {
      if (!info.hasAudio) throw new Error("The uploaded file has no audio stream.");

      const audioPath = path.join(workDir, "audio.m4a");
      await runFfmpeg(buildAudioArgs(inputPath, audioPath), workDir);
      const result = {
        audio_url: await uploadFile(audioPath, storagePath),
        has_video: info.hasVideo,
        video_hls_url: null,
      };

      if (info.hasVideo) {
        // Mostly still images - two renditions are plenty
        const hlsDir = path.join(workDir, "hls");
        await fs.promises.mkdir(hlsDir);
        await runFfmpeg(buildHlsArgs(inputPath, info, AUDIO_VIDEO_HEIGHTS), hlsDir);
        const hlsUrls = await uploadDirectory(hlsDir, storagePath);
        result.video_hls_url = hlsUrls[HLS_MASTER_PLAYLIST];
      }

      return result;
    },
  },
};

module.exports = { PROCESSORS };
