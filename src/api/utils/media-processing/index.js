/**
 * Media processing for the `shared.processed-video` and
 * `shared.processed-audio` components (see ./processors.js).
 *
 * When an editor uploads a source file, the entry's lifecycle queues the
 * component. Files are processed one at a time inside the CMS process:
 * download -> ffmpeg -> upload to S3 -> write the results back. The component
 * status is the source of truth, so anything left pending or processing after
 * a restart is picked up again on bootstrap.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { probe } = require("./ffmpeg");
const { downloadFile } = require("./storage");
const { PROCESSORS } = require("./processors");

const STATUS = Object.freeze({
  PENDING: "pending",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
});

const queue = [];
let isRunning = false;

// Components the pipeline is writing to right now, see protectGeneratedFields
const systemWrites = new Set();
const writeKey = (componentUid, id) => `${componentUid}:${id}`;

/**
 * Write pipeline results. Marked as a system write so the editor protection
 * below lets it through.
 */
async function updateComponent(componentUid, id, data) {
  const key = writeKey(componentUid, id);
  systemWrites.add(key);
  try {
    return await strapi.db.query(componentUid).update({ where: { id }, data });
  } finally {
    systemWrites.delete(key);
  }
}

const findComponent = (componentUid, id) =>
  strapi.db
    .query(componentUid)
    .findOne({ where: { id }, populate: { source: true } });

/**
 * Process one component's source file and store the result on it.
 *
 * @param {string} componentUid
 * @param {number} id - component id
 */
async function processComponent(componentUid, id) {
  const processor = PROCESSORS[componentUid];
  const component = await findComponent(componentUid, id);
  if (!component?.source) return;

  const { source } = component;
  await updateComponent(componentUid, id, { status: STATUS.PROCESSING, error: null });

  const workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "media-"));

  try {
    const inputPath = path.join(workDir, `source${source.ext}`);
    await downloadFile(source.url, inputPath);
    const info = await probe(inputPath);

    // One folder per source file, so a replaced file never overwrites a live one
    const result = await processor.run({
      inputPath,
      info,
      workDir,
      storagePath: `${processor.storageFolder}/${source.hash}`,
    });

    // The editor may have replaced the source while this one was processing
    const current = await findComponent(componentUid, id);
    if (current?.processed_source_id !== source.id) return;

    await updateComponent(componentUid, id, {
      ...result,
      duration_seconds: info.durationSeconds,
      status: STATUS.READY,
      error: null,
    });
    strapi.log.info(`${processor.label} ${source.name} processed`);
  } catch (err) {
    strapi.log.error(`Processing ${processor.label} ${source.name} failed: ${err.message}`);
    await updateComponent(componentUid, id, {
      status: STATUS.FAILED,
      error: err.message.slice(0, 2000),
    });
  } finally {
    await fs.promises.rm(workDir, { recursive: true, force: true });
  }
}

async function processQueue() {
  if (isRunning) return;
  isRunning = true;

  while (queue.length) {
    const { componentUid, id } = queue.shift();
    try {
      await processComponent(componentUid, id);
    } catch (err) {
      strapi.log.error(`Media processing queue error: ${err.message}`);
    }
  }

  isRunning = false;
}

function enqueue(componentUid, id) {
  if (!queue.some((item) => item.componentUid === componentUid && item.id === id)) {
    queue.push({ componentUid, id });
  }
  processQueue();
}

/**
 * @param {*} value - media relation as sent by the admin: id, { id }, or { set / connect: [...] }
 * @returns {number|null}
 */
const getMediaId = (value) => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return getMediaId(value[0]);
  if (typeof value === "object") {
    if (value.id !== undefined) return Number(value.id);
    return getMediaId(value.set ?? value.connect);
  }
  return Number(value);
};

/**
 * Editors save the whole component with the values the form had when it was
 * opened - an entry saved while its file was processing would wipe the
 * results. While the source stays the same, generated fields keep their
 * stored values. Without a source (e.g. a pasted HLS url) editors can set them.
 */
async function protectGeneratedFields(event) {
  const componentUid = event.model.uid;
  const { data, where } = event.params;
  const id = where?.id;
  if (!data || !id || typeof id === "object") return;
  if (systemWrites.has(writeKey(componentUid, id))) return;

  const current = await findComponent(componentUid, id);
  if (!current?.source) return;

  const incomingSourceId = Object.prototype.hasOwnProperty.call(data, "source")
    ? getMediaId(data.source)
    : current.source.id;
  if (incomingSourceId !== current.source.id) return;

  PROCESSORS[componentUid].generatedFields.forEach((field) => {
    delete data[field];
  });
}

/**
 * Lifecycles that queue the processed media components of `fields` whenever
 * a new source is uploaded. Use in a content type's lifecycles.js.
 *
 * @param {string} uid - content type UID
 * @param {string[]} fields - attributes holding a processed media component
 * @returns {{afterCreate: function, afterUpdate: function}}
 */
function createMediaProcessingLifecycles(uid, fields) {
  async function queueNewSources(event) {
    const id = event.result?.id;
    if (!id) return;

    const entry = await strapi.entityService.findOne(uid, id, {
      populate: Object.fromEntries(fields.map((field) => [field, { populate: ["source"] }])),
    });
    const { attributes } = strapi.getModel(uid);

    for (const field of fields) {
      const component = entry?.[field];
      const componentUid = attributes[field].component;

      // processed_source_id is set when queueing, so our own updates don't re-queue
      if (!component?.source || component.source.id === component.processed_source_id) {
        continue;
      }

      await updateComponent(componentUid, component.id, {
        status: STATUS.PENDING,
        processed_source_id: component.source.id,
        error: null,
      });
      enqueue(componentUid, component.id);
    }
  }

  return {
    afterCreate: queueNewSources,
    afterUpdate: queueNewSources,
  };
}

/**
 * Protect generated fields and re-queue files interrupted by a restart.
 * Call from bootstrap.
 */
async function registerMediaProcessing() {
  const componentUids = Object.keys(PROCESSORS);

  strapi.db.lifecycles.subscribe({
    models: componentUids,
    beforeUpdate: protectGeneratedFields,
  });

  for (const componentUid of componentUids) {
    const { label, backfillWhere } = PROCESSORS[componentUid];
    const components = await strapi.db.query(componentUid).findMany({
      select: ["id"],
      where: { status: { $in: [STATUS.PENDING, STATUS.PROCESSING] } },
    });
    if (components.length) {
      strapi.log.info(`Resuming processing of ${components.length} ${label} file(s)`);
    }
    components.forEach(({ id }) => enqueue(componentUid, id));

    // Files processed before the processor produced everything it does now
    if (backfillWhere) {
      const outdated = await strapi.db.query(componentUid).findMany({
        select: ["id"],
        where: { ...backfillWhere, source: { id: { $notNull: true } } },
      });
      if (outdated.length) {
        strapi.log.info(`Processing ${outdated.length} ${label} file(s) again for new outputs`);
      }
      for (const { id } of outdated) {
        await updateComponent(componentUid, id, { status: STATUS.PENDING });
        enqueue(componentUid, id);
      }
    }
  }
}

module.exports = {
  STATUS,
  createMediaProcessingLifecycles,
  registerMediaProcessing,
};
