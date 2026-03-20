const DEG2RAD = Math.PI / 180;

// Vertex shader — single oversized triangle covering the entire clip space
const VERT_SRC_300 = `#version 300 es
void main() {
  // Generates a full-screen triangle: (-1,-1), (3,-1), (-1,3)
  vec2 pos = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  gl_Position = vec4(pos, 0.0, 1.0);
}`;

const VERT_SRC_100 = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Fragment shader — inverse orthographic projection
const FRAG_SRC_300 = `#version 300 es
precision highp float;

uniform vec2 uCenter;     // [lon, lat] of sphere center in radians
uniform float uRadius;    // sphere radius in physical pixels
uniform vec2 uResolution; // canvas physical size
uniform vec2 uTranslate;  // sphere center in physical pixels
uniform float uDarken;    // 0.0 = no dim, 0.5 = dark mode
uniform sampler2D uTexture;

out vec4 fragColor;

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  // gl_FragCoord.y is bottom-up; flip to screen top-down for drawImage compatibility
  fragCoord.y = uResolution.y - fragCoord.y;

  float x = fragCoord.x - uTranslate.x;
  // Negate y: screen y increases downward, but Snyder formulas expect y increasing northward
  float y = -(fragCoord.y - uTranslate.y);
  float rho = sqrt(x * x + y * y);

  if (rho > uRadius) {
    fragColor = vec4(0.0);
    return;
  }

  float c = asin(clamp(rho / uRadius, -1.0, 1.0));
  float sinC = sin(c);
  float cosC = cos(c);

  float lon0 = uCenter.x;
  float lat0 = uCenter.y;
  float sinLat0 = sin(lat0);
  float cosLat0 = cos(lat0);

  float lat = asin(cosC * sinLat0 + (y * sinC * cosLat0) / max(rho, 0.0001));
  float lon = lon0 + atan(x * sinC, rho * cosLat0 * cosC - y * sinLat0 * sinC);

  // Equirectangular UV mapping
  float u = (lon + 3.14159265359) / (2.0 * 3.14159265359);
  float v = (1.5707963268 - lat) / 3.14159265359;

  vec3 color = texture(uTexture, vec2(u, v)).rgb;
  color *= (1.0 - uDarken);
  fragColor = vec4(color, 1.0);
}`;

const FRAG_SRC_100 = `
precision highp float;

uniform vec2 uCenter;
uniform float uRadius;
uniform vec2 uResolution;
uniform vec2 uTranslate;
uniform float uDarken;
uniform sampler2D uTexture;

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  fragCoord.y = uResolution.y - fragCoord.y;

  float x = fragCoord.x - uTranslate.x;
  float y = -(fragCoord.y - uTranslate.y);
  float rho = sqrt(x * x + y * y);

  if (rho > uRadius) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float c = asin(clamp(rho / uRadius, -1.0, 1.0));
  float sinC = sin(c);
  float cosC = cos(c);

  float lon0 = uCenter.x;
  float lat0 = uCenter.y;
  float sinLat0 = sin(lat0);
  float cosLat0 = cos(lat0);

  float lat = asin(cosC * sinLat0 + (y * sinC * cosLat0) / max(rho, 0.0001));
  float lon = lon0 + atan(x * sinC, rho * cosLat0 * cosC - y * sinLat0 * sinC);

  float u = (lon + 3.14159265359) / (2.0 * 3.14159265359);
  float v = (1.5707963268 - lat) / 3.14159265359;

  vec3 color = texture2D(uTexture, vec2(u, v)).rgb;
  color *= (1.0 - uDarken);
  gl_FragColor = vec4(color, 1.0);
}`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function linkProgram(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram | null {
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

export class GlobeTextureRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture | null = null;
  private textureLoaded = false;
  private isWebGL2: boolean;

  // Uniform locations
  private uCenter: WebGLUniformLocation | null;
  private uRadius: WebGLUniformLocation | null;
  private uResolution: WebGLUniformLocation | null;
  private uTranslate: WebGLUniformLocation | null;
  private uDarken: WebGLUniformLocation | null;
  private uTexture: WebGLUniformLocation | null;

  // WebGL1 fallback: triangle buffer
  private triBuffer: WebGLBuffer | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'none';

    // Try WebGL2 first, fall back to WebGL1
    let gl = this.canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false });
    this.isWebGL2 = !!gl;
    if (!gl) {
      gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
    }
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;

    // Context loss handling
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.textureLoaded = false;
    });

    // Build shader program
    const vertSrc = this.isWebGL2 ? VERT_SRC_300 : VERT_SRC_100;
    const fragSrc = this.isWebGL2 ? FRAG_SRC_300 : FRAG_SRC_100;

    const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) throw new Error('Shader compilation failed');

    const prog = linkProgram(gl, vs, fs);
    if (!prog) throw new Error('Program linking failed');
    this.program = prog;

    // Clean up individual shaders (attached to program, no longer needed)
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    // Cache uniform locations
    this.uCenter = gl.getUniformLocation(prog, 'uCenter');
    this.uRadius = gl.getUniformLocation(prog, 'uRadius');
    this.uResolution = gl.getUniformLocation(prog, 'uResolution');
    this.uTranslate = gl.getUniformLocation(prog, 'uTranslate');
    this.uDarken = gl.getUniformLocation(prog, 'uDarken');
    this.uTexture = gl.getUniformLocation(prog, 'uTexture');

    // For WebGL1, we need a vertex buffer for the oversized triangle
    if (!this.isWebGL2) {
      const posLoc = gl.getAttribLocation(prog, 'aPos');
      this.triBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         3, -1,
        -1,  3,
      ]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    } else {
      // WebGL2: create a VAO for the vertex-ID-based triangle
      const gl2 = gl as WebGL2RenderingContext;
      const vao = gl2.createVertexArray();
      gl2.bindVertexArray(vao);
    }
  }

  resize(size: number, dpr: number) {
    const w = Math.round(size * dpr);
    if (this.canvas.width !== w || this.canvas.height !== w) {
      this.canvas.width = w;
      this.canvas.height = w;
    }
  }

  setTexture(img: HTMLImageElement) {
    const gl = this.gl;
    if (this.texture) gl.deleteTexture(this.texture);

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // REPEAT on S for seamless antimeridian crossing, CLAMP on T for poles
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    this.textureLoaded = true;
  }

  render(
    rotation: [number, number, number],
    scale: number,
    translate: [number, number],
    isDark: boolean,
    dpr: number,
  ) {
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;

    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    // Set uniforms
    gl.uniform2f(this.uCenter, -rotation[0] * DEG2RAD, -rotation[1] * DEG2RAD);
    gl.uniform1f(this.uRadius, scale * dpr);
    gl.uniform2f(this.uResolution, w, h);
    gl.uniform2f(this.uTranslate, translate[0] * dpr, translate[1] * dpr);
    gl.uniform1f(this.uDarken, isDark ? 0.5 : 0.0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uTexture, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  isReady(): boolean {
    return this.textureLoaded && !this.gl.isContextLost();
  }

  dispose() {
    const gl = this.gl;
    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
    if (this.program) {
      gl.deleteProgram(this.program);
    }
    if (this.triBuffer) {
      gl.deleteBuffer(this.triBuffer);
      this.triBuffer = null;
    }
    this.textureLoaded = false;
  }

  static isSupported(): boolean {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  }
}
