// A painted scene moved by depth, in layers, on the GPU (tools/art/scene_depthmap.py).
//
// The stage slides a painted scene's floor in rows, near ground faster than
// far, and used to slide everything above the pin row as one flat piece. Here
// the scene is a few layers: the back, with what stands in front of it healed
// away, and the things standing in front, each layer carried on a little way
// behind the next. Each layer is a fine mesh, and each point of it slides at
// the speed of the floor as near as it is: the camp's crystal with the fire,
// the sea slower, the cliffs and sky slowest. Below the pin it's still each
// floor row at its own speed, so feet stay planted. Where a near thing slides
// off what's behind it, what shows is painted, not the painting stretched.

import { h } from "./dom.js";

const VERT = `#version 300 es
in vec2 aUV;
in float aF;
uniform vec2 uStage;
uniform vec2 uC;
uniform vec3 uCam;
uniform vec3 uImg;
uniform vec3 uTex;
out vec2 vTex;
void main() {
  float x = uC.x + uCam.z * (uImg.x + aUV.x * uImg.z - uC.x - uCam.x * aF);
  float y = uC.y + uCam.z * (uImg.y + aUV.y * uImg.z - uC.y - uCam.y);
  gl_Position = vec4(x / uStage.x * 2.0 - 1.0, 1.0 - y / uStage.y * 2.0, 0.0, 1.0);
  vTex = vec2((aUV.x + uTex.x) / uTex.y, aUV.y / uTex.z);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uPaint;
in vec2 vTex;
out vec4 color;
void main() {
  color = texture(uPaint, vTex);
}`;

/**
 * A depth projector for one painted scene, or null when this computer can't run one (no WebGL 2):
 * the stage then draws the back of the scene in one piece, as before.
 *   depthImg  the depth map (loaded): each layer's at half size, one under the other;
 *             lo, hi  the stage rows its 0 and 255 stand for
 *   layers    the pictures, back first, each the painting with its painted sides on (loaded)
 *   size      [w, h] of the painting; pad  painting px of painted sides on each side
 *   speed(y)  how fast the floor at stage row y moves with the camera; pin  the row the floor goes in rows from
 *   imgTop, scale  where the painting's top row sits on the stage, and its scale
 *   step      painting px between the mesh's points
 */
export function createProjection({ depthImg, lo, hi, layers, size: [W, H], pad = 0, speed, pin, imgTop, scale, step = 2 }) {
  const canvas = h("canvas");
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
  if (!gl) return null;
  const shader = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const U = {};
  for (const name of ["uStage", "uC", "uCam", "uImg", "uTex", "uPaint"]) U[name] = gl.getUniformLocation(prog, name);
  const WW = W + 2 * pad;
  const pixels = (img, w, hh) => {
    const g = h("canvas", { width: w, height: hh }).getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, hh);
    return g.getImageData(0, 0, w, hh).data;
  };

  // the depth map, read once: how fast each point of each layer moves
  const dw = depthImg.naturalWidth;
  const dh = depthImg.naturalHeight / layers.length;
  const depth = pixels(depthImg, dw, dh * layers.length);
  const speedAt = (layer, u, v) => {
    const y = imgTop + v * scale;
    if (y >= pin) return speed(y); // the floor in front of the pin: each row its own, like the people on it
    const x = Math.min(dw - 1, Math.max(0, Math.round(((u + pad) / WW) * dw - 0.5)));
    const yy = Math.min(dh - 1, Math.max(0, Math.round((v / H) * dh - 0.5)));
    return speed(lo + (depth[((layer * dh + yy) * dw + x) * 4] / 255) * (hi - lo));
  };

  // the mesh, over the painting and its sides: one grid of points, each layer moving them its own way
  const nx = Math.ceil(WW / step);
  const ny = Math.ceil(H / step);
  const pos = new Float32Array((nx + 1) * (ny + 1) * 2);
  for (let j = 0, k = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++, k++) {
      pos[2 * k] = Math.min(W + pad, i * step - pad);
      pos[2 * k + 1] = Math.min(H, j * step);
    }
  }
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
  const aUV = gl.getAttribLocation(prog, "aUV");
  const aF = gl.getAttribLocation(prog, "aF");
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  const meshes = layers.map((img, layer) => {
    const F = new Float32Array((nx + 1) * (ny + 1));
    for (let k = 0; k < F.length; k++) F[k] = speedAt(layer, pos[2 * k], pos[2 * k + 1]);
    // the back covers everything; a near layer only where it has something, and a cell round it
    let used = null;
    if (layer > 0) {
      const alpha = pixels(img, WW, H);
      used = new Uint8Array(nx * ny);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < WW; x++) {
          if (alpha[(y * WW + x) * 4 + 3] === 0) continue;
          const ci = Math.floor(x / step);
          const cj = Math.floor(y / step);
          for (let b = Math.max(0, cj - 1); b <= Math.min(ny - 1, cj + 1); b++) for (let a = Math.max(0, ci - 1); a <= Math.min(nx - 1, ci + 1); a++) used[b * nx + a] = 1;
        }
      }
    }
    const cells = used ? used.reduce((n, u) => n + u, 0) : nx * ny;
    const index = new Uint32Array(cells * 6);
    for (let j = 0, n = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        if (used && !used[j * nx + i]) continue;
        const a = j * (nx + 1) + i;
        const b = a + nx + 1;
        index.set([a, a + 1, b, b, a + 1, b + 1], n);
        n += 6;
      }
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, F, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aF);
    gl.vertexAttribPointer(aF, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    return { vao, tex, count: index.length };
  });

  const projector = {
    canvas,
    lost: false,
    /** Draw it for this camera ({ x, y, zoom }) at this many canvas pixels per stage pixel. */
    draw({ camera, dpr, stage: [sw, sh], centre, imgLeft }) {
      const w = Math.round(sw * dpr);
      const hh = Math.round(sh * dpr);
      if (canvas.width !== w || canvas.height !== hh) {
        canvas.width = w;
        canvas.height = hh;
      }
      gl.viewport(0, 0, w, hh);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.uStage, sw, sh);
      gl.uniform2f(U.uC, centre.x, centre.y);
      gl.uniform3f(U.uCam, camera.x, camera.y, camera.zoom);
      gl.uniform3f(U.uImg, imgLeft, imgTop, scale);
      gl.uniform3f(U.uTex, pad, WW, H);
      gl.uniform1i(U.uPaint, 0);
      gl.activeTexture(gl.TEXTURE0);
      meshes.forEach(({ vao, tex, count }, layer) => {
        // the near layers over the back, by their own see-through edges (premultiplied)
        if (layer === 1) {
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        }
        gl.bindVertexArray(vao);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0);
      });
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
      return canvas;
    },
  };
  canvas.addEventListener("webglcontextlost", () => (projector.lost = true));
  return projector;
}
