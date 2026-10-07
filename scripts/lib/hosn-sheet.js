/**
 * Reading the Hosn El Hal "Master Asset Mapping" spreadsheet (.xlsx) without
 * dependencies - an .xlsx is a zip of XML files, read with `unzip`.
 */
const { execFileSync } = require("child_process");

const SHEET_NAME = "Asset Library";

const COLUMNS = {
  pillar: "A",
  type: "B",
  typeNumber: "C",
  titleEn: "D",
  titleAr: "E",
  descriptionEn: "F",
  descriptionAr: "G",
  order: "H",
};

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

const decodeXml = (text) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");

const readZipEntry = (file, entry) =>
  execFileSync("unzip", ["-p", file, entry], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const textOf = (xml) =>
  decodeXml([...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));

/**
 * @param {string} file - .xlsx path
 * @param {string} sheetName
 * @returns {object[]} rows as { A: "...", B: "...", ... }, header row included
 */
function readSheet(file, sheetName = SHEET_NAME) {
  const sharedStrings = (() => {
    try {
      return [...readZipEntry(file, "xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map(
        (m) => textOf(m[1])
      );
    } catch {
      return [];
    }
  })();

  const workbook = readZipEntry(file, "xl/workbook.xml");
  const sheet = [...workbook.matchAll(/<sheet\b[^>]*>/g)]
    .map((m) => m[0])
    .find((tag) => decodeXml(tag.match(/name="([^"]*)"/)[1]) === sheetName);
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found in ${file}`);

  const relationId = sheet.match(/r:id="([^"]*)"/)[1];
  const relations = readZipEntry(file, "xl/_rels/workbook.xml.rels");
  const target = [...relations.matchAll(/<Relationship\b[^>]*>/g)]
    .map((m) => m[0])
    .find((tag) => tag.includes(`Id="${relationId}"`))
    .match(/Target="([^"]*)"/)[1];
  const sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target}`;

  const rows = [];
  for (const [, rowXml] of readZipEntry(file, sheetPath).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = {};
    for (const [, attributes, body] of rowXml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const column = attributes.match(/r="([A-Z]+)\d+"/)[1];
      const type = (attributes.match(/t="([^"]*)"/) || [])[1];
      const value = ((body || "").match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      if (type === "s") row[column] = sharedStrings[Number(value)];
      else if (type === "inlineStr") row[column] = textOf(body || "");
      else if (value !== undefined) row[column] = decodeXml(value);
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Asset rows of one spreadsheet type, e.g. "Audio" or "Key Message / Thumbnail"
 */
const readAssetRows = (file, sheetType) =>
  readSheet(file)
    .slice(1)
    .filter((row) => (row[COLUMNS.type] || "").trim() === sheetType);

/** "Thumbnail 03" -> 3 */
const getNumber = (text) => Number((String(text || "").match(/(\d+)\s*$/) || [])[1]);

/** "A3.jpg" -> "A3" */
const baseName = (name) => name.replace(/\.[^.]+$/, "");

module.exports = {
  COLUMNS,
  IMAGE_EXTENSIONS,
  readSheet,
  readAssetRows,
  getNumber,
  baseName,
};
