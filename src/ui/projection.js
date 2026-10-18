// A painted scene bent by its depth map (tools/art/scene_depthmap.py), on the GPU.
//
// The stage slides a painted scene's floor in rows, near ground faster than
// far, and used to slide everything above the pin row as one flat piece. Here
// the painting is a fine mesh, and each point of it slides at the speed of the
// floor as near as it is: the camp's crystal with the fire, the sea slower, the
// cliffs and sky slowest. Below the pin it's still each floor row at its own
// speed, so feet stay planted. The depth map holds each near thing's depth a
// little way out past its edge, so it moves whole and the painting bends
// gently in what's behind it instead.

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
 *   depthImg  the depth map (loaded); lo, hi  the stage rows its 0 and 255 stand for
 *   size      [w, h] of the painting; pad  painting px of painted sides on each side
 *   speed(y)  how fast the floor at stage row y moves with the camera; pin  the row the floor goes in rows from
 *   imgTop, scale  where the painting's top row sits on the stage, and its scale
 *   step      painting px between the mesh's points
 */
export function createProjection({ depthImg, lo, hi, size: [W, H], pad = 0, speed, pin, imgTop, scale, step = 2 }) {
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

  // the depth map, read once: how fast each point of the mesh moves
  const read = h("canvas", { width: W, height: H }).getContext("2d", { willReadFrequently: true });
  read.drawImage(depthImg, 0, 0, W, H);
  const depth = read.getImageData(0, 0, W, H).data;
  const speedAt = (u, v) => {
    const y = imgTop + v * scale;
    if (y >= pin) return speed(y); // the floor in front of the pin: each row its own, like the people on it
    const x = Math.min(W - 1, Math.max(0, Math.round(u)));
    const yy = Math.min(H - 1, Math.max(0, Math.round(v)));
    return speed(lo + (depth[(yy * W + x) * 4] / 255) * (hi - lo));
  };

  // the mesh, over the painting and its sides
  const nx = Math.ceil((W + 2 * pad) / step);
  const ny = Math.ceil(H / step);
  const pos = new Float32Array((nx + 1) * (ny + 1) * 2);
  const F = new Float32Array((nx + 1) * (ny + 1));
  for (let j = 0, k = 0; j <= ny; j++) {
    const v = Math.min(H, j * step);
    for (let i = 0; i <= nx; i++, k++) {
      const u = Math.min(W + pad, i * step - pad);
      pos[2 * k] = u;
      pos[2 * k + 1] = v;
      F[k] = speedAt(u, v);
    }
  }
  const index = new Uint32Array(nx * ny * 6);
  for (let j = 0, n = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++, n += 6) {
      const a = j * (nx + 1) + i;
      const b = a + nx + 1;
      index.set([a, a + 1, b, b, a + 1, b + 1], n);
    }
  }
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  for (const [name, data, n] of [["aUV", pos, 2], ["aF", F, 1]]) {
    const loc = gl.getAttribLocation(prog, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);

  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  const wide = h("canvas", { width: W + 2 * pad, height: H });

  const projector = {
    canvas,
    lost: false,
    /** The picture to bend (the painting or its plate, the size of the painting), with its painted sides if it has them. */
    setPainting(img, left = null, right = null) {
      const g = wide.getContext("2d");
      g.clearRect(0, 0, wide.width, wide.height);
      g.drawImage(img, pad, 0, W, H);
      if (left) g.drawImage(left, 0, 0, pad, H);
      if (right) g.drawImage(right, pad + W, 0, pad, H);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wide);
    },
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
      gl.uniform3f(U.uTex, pad, W + 2 * pad, H);
      gl.uniform1i(U.uPaint, 0);
      gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_INT, 0);
      return canvas;
    },
  };
  canvas.addEventListener("webglcontextlost", () => (projector.lost = true));
  return projector;
}
