// A painted scene drawn from its depth map (tools/art/scene_depth.py), on the GPU.
//
// The stage draws a painting in thin rows, each floor row sliding at its own
// depth as the camera pans. That's right for the floor, but a table standing
// on near floor has its top painted up among far rows, so row by row it would
// shear. The depth map says, for each pixel that stands up off the floor, the
// stage row of the floor that is as near as it is; here each pixel of the
// screen looks along its row for the painted pixel that lands on it, nearest
// first, so the table moves whole, at the speed of the floor it stands on.
// Where a near thing slides off what was behind it, the gap takes the colour
// from behind (never a smear of the near thing).
//
// A second pass draws only what is nearer than anyone can walk (the stool at
// the front), for the layer in front of the people.

import { h } from "./dom.js";

const MAX_STEPS = 64;

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform sampler2D uImg;
uniform sampler2D uDepth;
uniform sampler2D uRowMax;
uniform vec2 uRes;       // canvas pixels
uniform float uPx;       // canvas pixels per stage pixel
uniform vec2 uC;         // the stage's middle
uniform vec3 uCam;       // camera x, y, zoom
uniform vec3 uImgPos;    // the painting's left and top on the stage, and its scale
uniform vec2 uImgSize;   // painting pixels
uniform vec4 uDepthFit;  // pin row, eye row, reference row, damp
uniform vec2 uRows;      // the nearest row anything moves at, the depth map's unit
uniform float uNear;     // only draw what's nearer than this row (0: draw everything)

float factor(float y) {
  y = min(max(y, uDepthFit.x), uRows.x);
  return 1.0 + uDepthFit.w * (max(0.2, (y - uDepthFit.y) / (uDepthFit.z - uDepthFit.y)) - 1.0);
}
float mirror(float u) {
  return u < 0.0 ? -u : (u > uImgSize.x ? 2.0 * uImgSize.x - u : u);
}
// the stage row whose floor is as near as this painted pixel, if it stands up off the floor (0 if not)
float standing(float u, float v) {
  return texture2D(uDepth, vec2(mirror(u) / uImgSize.x, v / uImgSize.y)).r * 255.0 * uRows.y;
}

void main() {
  vec2 stage = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uPx;
  vec2 p = (stage - uC) / uCam.z + uC; // undo the zoom
  float row = p.y + uCam.y; // this painted row's own stage row
  float v = clamp((row - uImgPos.y) / uImgPos.z, 0.5, uImgSize.y - 0.5);
  float q = p.x - uImgPos.x;
  float rowMax = texture2D(uRowMax, vec2(v / uImgSize.y, 0.5)).r * 255.0 * uRows.y;
  float fLo = factor(row);
  float fHi = factor(max(row, rowMax));
  // a painted pixel at u lands at u * scale - camera * f: look from the nearest f to the farthest
  float u = (q + uCam.x * fLo) / uImgPos.z;
  float hit = standing(u, v);
  float span = abs(uCam.x) * (fHi - fLo) / uImgPos.z;
  if (span > 0.5) {
    float n = min(float(${MAX_STEPS}), ceil(span / 1.5));
    float fStep = (fHi - fLo) / n;
    float prevU = (q + uCam.x * fHi) / uImgPos.z;
    for (int i = 0; i <= ${MAX_STEPS}; i++) {
      float ft = fHi - fStep * float(i);
      float ut = (q + uCam.x * ft) / uImgPos.z;
      float st = standing(ut, v);
      float fs = factor(max(row, st));
      if (fs >= ft - 1e-4 || float(i) >= n) {
        // hit the side of something near: what shows here was behind it
        if (i > 0 && fs - ft > fStep * 2.0) { u = prevU; hit = 0.0; }
        else { u = ut; hit = st; }
        break;
      }
      prevU = ut;
    }
  }
  vec4 col = texture2D(uImg, vec2(mirror(u) / uImgSize.x, v / uImgSize.y));
  float a = (uNear <= 0.0 || hit > uNear) ? 1.0 : 0.0;
  gl_FragColor = vec4(col.rgb * a, a);
}
`;

/**
 * A depth painter for one scene, or null when this computer can't draw one
 * (no WebGL): the stage then draws in rows as before.
 *   depthImg  the depth map (loaded), unit  its step in stage rows
 */
export function createDepthPainter(depthImg, unit) {
  const canvas = h("canvas");
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
  if (!gl) return null;
  const shader = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    console.warn("depth painter off:", err);
    return null;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const name of ["uImg", "uDepth", "uRowMax", "uRes", "uPx", "uC", "uCam", "uImgPos", "uImgSize", "uDepthFit", "uRows", "uNear"]) U[name] = gl.getUniformLocation(prog, name);

  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  function texture(unitNo, filter) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unitNo);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    return t;
  }
  const imgTex = texture(0, gl.LINEAR);
  const depthTex = texture(1, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, depthImg);
  // each painted row's nearest standing thing, so rows with nothing near need no looking along
  const dw = depthImg.naturalWidth || depthImg.width;
  const dh = depthImg.naturalHeight || depthImg.height;
  const rowMax = new Uint8Array(dh);
  try {
    const c = h("canvas", { width: dw, height: dh });
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(depthImg, 0, 0);
    const px = g.getImageData(0, 0, dw, dh).data;
    for (let y = 0; y < dh; y++) {
      let m = 0;
      for (let x = 0; x < dw; x++) m = Math.max(m, px[(y * dw + x) * 4]);
      rowMax[y] = m;
    }
  } catch {
    rowMax.fill(255); // can't read it: look along every row as far as anything could be
  }
  texture(2, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, dh, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, rowMax);
  gl.uniform1i(U.uImg, 0);
  gl.uniform1i(U.uDepth, 1);
  gl.uniform1i(U.uRowMax, 2);

  let imgSource = null;
  let imgVersion = -1;
  let lost = false;
  canvas.addEventListener("webglcontextlost", () => (lost = true));

  return {
    get lost() {
      return lost || gl.isContextLost();
    },
    /**
     * Draw the painting as the camera sees it, onto the canvas returned.
     *   img, version   the painting (an image or canvas) and a number that changes when it's redrawn
     *   px             canvas pixels per stage pixel
     *   near           only what's nearer than this stage row (0: everything)
     */
    draw({ img, version, stageSize: [W, H], center, camera, imgPos, imgSize, pinY, eyeY, refY, damp, nearest, px, near = 0 }) {
      const cw = Math.round(W * px);
      const ch = Math.round(H * px);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      if (img !== imgSource || version !== imgVersion) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imgTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        imgSource = img;
        imgVersion = version;
      }
      gl.viewport(0, 0, cw, ch);
      gl.uniform2f(U.uRes, cw, ch);
      gl.uniform1f(U.uPx, cw / W);
      gl.uniform2f(U.uC, center.x, center.y);
      gl.uniform3f(U.uCam, camera.x, camera.y, camera.zoom);
      gl.uniform3f(U.uImgPos, imgPos[0], imgPos[1], imgPos[2]);
      gl.uniform2f(U.uImgSize, imgSize[0], imgSize[1]);
      gl.uniform4f(U.uDepthFit, pinY, eyeY, refY, damp);
      gl.uniform2f(U.uRows, nearest, unit);
      gl.uniform1f(U.uNear, near);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return canvas;
    },
  };
}
