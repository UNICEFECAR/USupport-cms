/**
 * File transfer helpers. Uploads go through the configured Strapi upload
 * provider (S3), so processed files get the same bucket, ACL and URL format
 * as regular media library uploads.
 */
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");
const fetch = require("node-fetch");

const MIME_TYPES = {
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".mp4": "video/mp4",
};

const UPLOAD_CONCURRENCY = 8;

/**
 * Download a media library file to disk.
 *
 * @param {string} url - absolute URL, or a /uploads path for the local provider
 * @param {string} destination - file path to write to
 */
async function downloadFile(url, destination) {
  if (url.startsWith("/")) {
    await fs.promises.copyFile(path.join(strapi.dirs.static.public, url), destination);
    return;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Downloading the source video failed with status ${response.status}.`);
  }
  await pipeline(response.body, fs.createWriteStream(destination));
}

/**
 * Upload one file to `<storagePath>/<file name>`.
 *
 * @param {string} filePath - local file
 * @param {string} storagePath - folder in the bucket
 * @returns {Promise<string>} public URL of the uploaded file
 */
async function uploadFile(filePath, storagePath) {
  const ext = path.extname(filePath);
  const file = {
    path: storagePath,
    hash: path.basename(filePath, ext),
    ext,
    mime: MIME_TYPES[ext] || "application/octet-stream",
    stream: fs.createReadStream(filePath),
  };

  await strapi.plugin("upload").provider.uploadStream(file);
  return file.url;
}

/**
 * Upload every file of a directory to `<storagePath>/`.
 *
 * @param {string} directory - local directory
 * @param {string} storagePath - folder in the bucket
 * @returns {Promise<object>} map of file name to public URL
 */
async function uploadDirectory(directory, storagePath) {
  const fileNames = await fs.promises.readdir(directory);
  const urls = {};

  for (let i = 0; i < fileNames.length; i += UPLOAD_CONCURRENCY) {
    const batch = fileNames.slice(i, i + UPLOAD_CONCURRENCY);
    await Promise.all(
      batch.map(async (fileName) => {
        urls[fileName] = await uploadFile(path.join(directory, fileName), storagePath);
      })
    );
  }

  return urls;
}

module.exports = {
  downloadFile,
  uploadFile,
  uploadDirectory,
};
