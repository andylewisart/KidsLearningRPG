// Painted interface art from art wave 02: the command icons, the window
// frame, the menu cursor and the logo. Everything here falls back to the
// plain look (emoji, CSS borders, text) while a piece of art is missing.

import { h } from "./dom.js";
import { assetInfo, preloadSheet } from "./sprites.js";

/** One icon from an icon sheet ("ui_icons_commands" by default, or "sheet:name"), or null. */
export function uiIcon(name, sheetId = "ui_icons_commands") {
  if (name?.includes(":")) [sheetId, name] = name.split(":");
  const sheet = assetInfo(sheetId)?.sheet;
  const i = sheet?.names ? sheet.names.indexOf(name) : -1;
  if (!sheet?.src || i < 0) return null;
  const cols = sheet.cols || 4;
  const rows = sheet.rows || 4;
  return h("span.ui-icon", {
    style: {
      backgroundImage: `url("assets/${sheet.src}")`,
      backgroundSize: `${cols * 100}% ${rows * 100}%`,
      backgroundPosition: `${((i % cols) / (cols - 1)) * 100}% ${(Math.floor(i / cols) / (rows - 1)) * 100}%`,
    },
  });
}

/**
 * Fetch icon sheets now (by id), so a window's icons are there the moment it
 * shows. An icon is a CSS background, which the browser only fetches once
 * it's on screen: a window that opens with a sheet it hasn't seen yet shows
 * an empty square until it arrives (and a big one paints in from the top).
 * Resolves once they're decoded, or after `ms` at the longest; a sheet
 * that's missing or broken holds nothing up.
 */
export function loadIcons(ids, ms = 1500) {
  const loads = ids.map((id) => {
    const img = preloadSheet(assetInfo(id)?.sheet?.src);
    return img?.decode ? img.decode().catch(() => {}) : null;
  });
  return Promise.race([Promise.all(loads), new Promise((resolve) => setTimeout(resolve, ms))]);
}

/**
 * Button contents: the painted icon in place of a leading emoji ("⚔ Strike"
 * becomes [icon, "Strike"]). Without the art, the label stays as it is.
 */
export function iconLabel(name, label) {
  const icon = name && uiIcon(name);
  if (!icon) return [label];
  return [icon, h("span", {}, label.replace(/^[^\p{L}\p{N}]+/u, ""))];
}

/** Turn on the painted window frame and menu cursor (CSS reads these variables). */
export function applyUiArt() {
  const root = document.documentElement;
  // absolute URLs: a url() inside a CSS variable resolves against the stylesheet, not the page
  const abs = (src) => `url("${new URL(`assets/${src}`, document.baseURI).href}")`;
  const frame = assetInfo("ui_frame");
  if (frame?.base?.src) {
    root.style.setProperty("--ui-frame", abs(frame.base.src));
    root.style.setProperty("--ui-frame-slice", String(frame.slice || 96));
    root.classList.add("has-ui-frame");
  }
  const cursor = assetInfo("ui_cursor");
  if (cursor?.base?.src) {
    root.style.setProperty("--ui-cursor", abs(cursor.base.src));
    root.classList.add("has-ui-cursor");
  }
}

/** The command icon for each hero's main move (the Beastkeeper's Slow is on the status sheet). */
export const MOVE_ICON = { knight: "strike", gunner: "fire", spellwright: "cast", titancaller: "lash", beastkeeper: "icons_elements_status:slow" };
