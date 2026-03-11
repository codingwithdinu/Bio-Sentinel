import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export async function getUserLocation() {
  if (Capacitor.isNativePlatform()) {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
    });
    return pos.coords;
  }

  // Web fallback
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      reject,
      { enableHighAccuracy: true }
    );
  });
}