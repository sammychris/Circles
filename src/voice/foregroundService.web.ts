// Browsers: no lock-screen service. The microphone is asked for by the browser itself.

export function registerForegroundService() {}

export async function startRoomService(_roomTitle: string, _canTalk: boolean) {}

export async function stopRoomService() {}

export async function micPermissionGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
    return status?.state === 'granted';
  } catch {
    return false;
  }
}

export async function requestMicPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(): Promise<void> {}
