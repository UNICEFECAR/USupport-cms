/**
 * ffmpeg / ffprobe helpers used to turn an uploaded video into an adaptive
 * HLS stream plus a small MP4 for downloads.
 */
const { spawn } = require("child_process");

// Limit ffmpeg so transcoding doesn't starve the CMS process
const THREADS = String(process.env.VIDEO_PROCESSING_THREADS || 2);

// HLS ladder. Renditions taller than the source are skipped (no upscaling).
const RENDITIONS = [
  { height: 240, bitrate: "400k", maxrate: "450k", bufsize: "800k", profile: "baseline", level: "3.0", audioBitrate: "64k" },
  { height: 360, bitrate: "700k", maxrate: "800k", bufsize: "1400k", profile: "baseline", level: "3.0", audioBitrate: "96k" },
  { height: 480, bitrate: "1200k", maxrate: "1400k", bufsize: "2400k", profile: "main", level: "3.1", audioBitrate: "128k" },
  { height: 720, bitrate: "2500k", maxrate: "2800k", bufsize: "5000k", profile: "high", level: "4.0", audioBitrate: "128k" },
  { height: 1080, bitrate: "4500k", maxrate: "5000k", bufsize: "8000k", profile: "high", level: "4.2", audioBitrate: "160k" },
];

// The downloadable MP4 uses the 360p settings - small enough for phones
const DOWNLOAD_RENDITION = RENDITIONS[1];

const HLS_MASTER_PLAYLIST = "master.m3u8";

// 8 bit 4:2:0 is required by the baseline profile and supported by all players
// (screen recordings, 4:4:4 exports and 10 bit HDR phone videos are converted)
const PIXEL_FORMAT = "format=yuv420p";

/**
 * Run a command and reject with the tail of its stderr when it fails.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {object} [options] - child_process.spawn options
 * @returns {Promise<string>} stdout
 */
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      // Keep only the end, ffmpeg logs a lot
      stderr = (stderr + chunk).slice(-4000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve(stdout);
      reject(new Error(`${command} exited with code ${code}: ${stderr.trim()}`));
    });
  });
}

/**
 * Run ffmpeg with a lower CPU priority than the CMS.
 *
 * @param {string[]} args - ffmpeg arguments
 * @param {string} cwd - working directory for relative output paths
 */
const runFfmpeg = (args, cwd) =>
  run("nice", ["-n", "10", "ffmpeg", "-hide_banner", "-y", ...args], { cwd });

/**
 * @param {string} inputPath
 * @returns {Promise<{height: number, hasAudio: boolean, durationSeconds: number}>}
 */
async function probe(inputPath) {
  const output = await run("ffprobe", [
    "-v", "error",
    "-print_format", "json",
    "-show_streams",
    "-show_format",
    inputPath,
  ]).catch((err) => {
    throw new Error(`The uploaded file could not be read as a video. ${err.message}`);
  });
  const { streams = [], format = {} } = JSON.parse(output);
  const video = streams.find((stream) => stream.codec_type === "video");

  if (!video) throw new Error("The uploaded file has no video stream.");

  // Phone videos store portrait as landscape + rotation, ffmpeg auto-rotates
  const rotation = Math.abs(
    Number(
      video.tags?.rotate ||
        video.side_data_list?.find((data) => data.rotation !== undefined)?.rotation ||
        0
    )
  );
  const isRotated = rotation === 90 || rotation === 270;

  return {
    height: isRotated ? video.width : video.height,
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
    durationSeconds: Math.round(Number(format.duration) || 0),
  };
}

/**
 * @param {number} sourceHeight
 * @returns {object[]} renditions not taller than the source (at least one)
 */
function selectRenditions(sourceHeight) {
  const renditions = RENDITIONS.filter((r) => r.height <= sourceHeight);
  return renditions.length ? renditions : [RENDITIONS[0]];
}

const videoCodecArgs = (rendition, index) => {
  const suffix = index === undefined ? "" : `:${index}`;
  return [
    `-c:v${suffix}`, "libx264",
    `-b:v${suffix}`, rendition.bitrate,
    `-maxrate:v${suffix}`, rendition.maxrate,
    `-bufsize:v${suffix}`, rendition.bufsize,
    "-preset", "veryfast",
    `-profile:v${suffix}`, rendition.profile,
    `-level:v${suffix}`, rendition.level,
  ];
};

const audioCodecArgs = (rendition, index) => {
  const suffix = index === undefined ? "" : `:${index}`;
  return [`-c:a${suffix}`, "aac", `-b:a${suffix}`, rendition.audioBitrate];
};

/**
 * Arguments for the adaptive HLS output (master.m3u8 + one playlist per
 * rendition), written relative to the working directory.
 *
 * @param {string} inputPath
 * @param {{height: number, hasAudio: boolean}} info - result of probe()
 * @returns {string[]}
 */
function buildHlsArgs(inputPath, { height, hasAudio }) {
  const renditions = selectRenditions(height);

  const splitOutputs = renditions.map((_, i) => `[v${i}]`).join("");
  const scales = renditions.map(
    (r, i) => `[v${i}]scale=-2:${r.height}:flags=lanczos,${PIXEL_FORMAT}[v${i}out]`
  );
  const filter = [`[0:v]split=${renditions.length}${splitOutputs}`, ...scales].join(";");

  const outputs = renditions.flatMap((rendition, i) => [
    "-map", `[v${i}out]`,
    ...(hasAudio ? ["-map", "0:a:0"] : []),
    ...videoCodecArgs(rendition, i),
    ...(hasAudio ? audioCodecArgs(rendition, i) : []),
  ]);

  const streamMap = renditions
    .map((_, i) => (hasAudio ? `v:${i},a:${i}` : `v:${i}`))
    .join(" ");

  return [
    "-i", inputPath,
    "-threads", THREADS,
    "-filter_complex", filter,
    ...outputs,
    "-f", "hls",
    "-hls_time", "6",
    "-hls_playlist_type", "vod",
    "-hls_segment_filename", "hls_%v_%03d.ts",
    "-master_pl_name", HLS_MASTER_PLAYLIST,
    "-var_stream_map", streamMap,
    "hls_%v.m3u8",
  ];
}

/**
 * Arguments for the downloadable MP4.
 *
 * @param {string} inputPath
 * @param {{height: number, hasAudio: boolean}} info - result of probe()
 * @param {string} outputPath
 * @returns {string[]}
 */
function buildDownloadArgs(inputPath, { height, hasAudio }, outputPath) {
  const rendition =
    height >= DOWNLOAD_RENDITION.height ? DOWNLOAD_RENDITION : selectRenditions(height)[0];

  return [
    "-i", inputPath,
    "-threads", THREADS,
    "-map", "0:v:0",
    ...(hasAudio ? ["-map", "0:a:0"] : []),
    "-vf", `scale=-2:${rendition.height}:flags=lanczos,${PIXEL_FORMAT}`,
    ...videoCodecArgs(rendition),
    ...(hasAudio ? audioCodecArgs(rendition) : []),
    "-movflags", "+faststart",
    outputPath,
  ];
}

module.exports = {
  HLS_MASTER_PLAYLIST,
  probe,
  runFfmpeg,
  buildHlsArgs,
  buildDownloadArgs,
};
