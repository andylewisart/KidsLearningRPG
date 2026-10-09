// Painted interface art from art wave 02: the command icons, the window
// frame, the menu cursor and the logo. Everything here falls back to the
// plain look (emoji, CSS borders, text) while a piece of art is missing.

import { h } from "./dom.js";
import { assetInfo } from "./sprites.js";

/** One icon from an icon sheet ("ui_icons_commands" by default), or null. */
export function uiIcon(name, sheetId = "ui_icons_commands") {
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

/** The command icon for each hero's main move. */
export const MOVE_ICON = { knight: "strike", gunner: "fire", spellwright: "cast", titancaller: "lash" };
