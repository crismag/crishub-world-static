export const oceanVertex = /* glsl */ `
attribute float aTint;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vLocal;
varying float vTint;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vLocal = position;
  vTint = aTint;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

/** Flat cartoon water: two blues with hard edges, banded light, a bright rim, and one soft glint. */
export const oceanFragment = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vLocal;
varying float vTint;
uniform float uTime;
void main() {
  vec3 n = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorld);
  vec3 lightDir = normalize(vec3(0.55, 0.62, 0.56));

  float ripple = sin(vLocal.x * 7.0 + uTime * 0.5) * sin(vLocal.z * 6.0 - uTime * 0.4) * 0.05;
  float shallow = smoothstep(0.46, 0.54, vTint + ripple);
  vec3 deep = vec3(0.16, 0.55, 0.90);
  vec3 light = vec3(0.30, 0.74, 0.98);
  vec3 col = mix(deep, light, shallow);

  float l = dot(n, lightDir);
  float shade = 0.68 + 0.2 * smoothstep(-0.2, 0.0, l) + 0.12 * smoothstep(0.55, 0.65, l);
  col *= shade;

  float fres = 1.0 - max(dot(n, viewDir), 0.0);
  col = mix(col, vec3(0.62, 0.88, 1.0), smoothstep(0.62, 0.9, fres) * 0.55);

  vec3 halfDir = normalize(lightDir + viewDir);
  float glint = smoothstep(0.86, 0.9, pow(max(dot(n, halfDir), 0.0), 18.0));
  col = mix(col, vec3(0.9, 0.97, 1.0), glint * 0.35);

  gl_FragColor = vec4(col, 1.0);
}
`

export const atmosphereVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const atmosphereFragment = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec3 n = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - abs(dot(n, viewDir)), 3.1);
  gl_FragColor = vec4(0.6, 0.85, 1.0, fres * 0.7);
}
`
