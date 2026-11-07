export const oceanVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const oceanFragment = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorld;
uniform float uTime;
void main() {
  vec3 n = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorld);
  vec3 lightDir = normalize(vec3(0.45, 0.72, 0.42));
  float wrap = dot(n, lightDir) * 0.5 + 0.5;
  float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5);
  float wave = sin(vWorld.x * 5.5 + uTime * 0.32) * sin(vWorld.z * 4.6 - uTime * 0.24);
  vec3 deep = vec3(0.035, 0.16, 0.34);
  vec3 mid = vec3(0.09, 0.40, 0.58);
  vec3 shallow = vec3(0.45, 0.78, 0.74);
  vec3 col = mix(deep, mid, wrap);
  col = mix(col, shallow, smoothstep(-0.2, 0.85, wave) * 0.2);
  col += fres * vec3(0.62, 0.88, 0.98) * 0.85;
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(n, halfDir), 0.0), 64.0) * wrap;
  col += spec * vec3(1.0, 0.96, 0.86) * 0.42;
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
  gl_FragColor = vec4(0.62, 0.86, 0.96, fres * 0.9);
}
`
