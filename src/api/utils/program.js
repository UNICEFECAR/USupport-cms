/**
 * Programs (sites) that share this CMS. uSupport content is additionally
 * scoped by country / global, the other programs have one entry per locale.
 */
const PROGRAMS = Object.freeze({
  USUPPORT: "usupport",
  PLAYANDHEAL: "playandheal",
  HOSNELHAL: "hosnelhal",
});

const PROGRAM_LABELS = Object.freeze({
  [PROGRAMS.USUPPORT]: "uSupport",
  [PROGRAMS.PLAYANDHEAL]: "Play and Heal",
  [PROGRAMS.HOSNELHAL]: "Hosn El Hal",
});

const isProgram = (value) => Object.values(PROGRAMS).includes(value);

/**
 * Resolve the program requested by a client.
 * Accepts `program=<value>`, `filters[program][$eq]=<value>` and the legacy
 * `filters[is_playandheal]` flag sent by older frontends.
 *
 * @param {object} query - Koa query object
 * @returns {string} one of PROGRAMS
 */
function getRequestedProgram(query = {}) {
  const filterValue = query.filters?.program;
  const program =
    query.program ||
    (typeof filterValue === "object" ? filterValue?.$eq : filterValue);

  if (isProgram(program)) return program;
  if (query.filters?.is_playandheal) return PROGRAMS.PLAYANDHEAL;

  return PROGRAMS.USUPPORT;
}

/**
 * @param {object} entry - CMS entry with a `program` attribute
 * @returns {string} the entry program, defaulting to uSupport
 */
const getEntryProgram = (entry) => entry?.program || PROGRAMS.USUPPORT;

module.exports = {
  PROGRAMS,
  PROGRAM_LABELS,
  isProgram,
  getRequestedProgram,
  getEntryProgram,
};
