import * as THREE from 'three'

/** Three hard light bands, so land, clouds, and props read as painted toys rather than plastic. */
function createToonRamp(): THREE.DataTexture {
  const ramp = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat)
  ramp.minFilter = THREE.NearestFilter
  ramp.magFilter = THREE.NearestFilter
  ramp.generateMipmaps = false
  ramp.needsUpdate = true
  return ramp
}

export const toonRamp = createToonRamp()
