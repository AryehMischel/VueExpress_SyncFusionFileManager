export async function isVRDevice() {
    // Check if navigator.xr is enabled
    if (navigator.xr) {
      // Check if the user agent contains known VR headset names
      const userAgent = navigator.userAgent.toLowerCase();
      const knownVRHeadsets = [
        'quest', // Covers both Oculus Quest and Meta Quest
        'oculus rift',
        'htc vive',
        'valve index',
        'windows mixed reality'
      ];
  
      const isKnownVRHeadset = knownVRHeadsets.some(headset => userAgent.includes(headset.toLowerCase()));
  
      if (isKnownVRHeadset) {
        // Check if the device supports immersive VR sessions
        const supportsImmersiveVR = await navigator.xr.isSessionSupported('immersive-vr');
        return supportsImmersiveVR;
      }
    }
  
    return false;
  }