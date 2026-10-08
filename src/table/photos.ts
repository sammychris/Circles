import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '../lib/supabase';
import { PHOTOS_MAX, type Photo } from './model';

// Photos are made smaller before they're sent, so they load quickly on mobile data.
const MAX_WIDTH = 1280;
const QUALITY = 0.7;
// Signed links stop working after 3 hours; the photos themselves are deleted by then.
const LINK_SECONDS = 3 * 60 * 60;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bits = 0;
  let value = 0;
  let out = 0;
  for (const ch of clean) {
    value = (value << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[out++] = (value >> bits) & 0xff;
    }
  }
  return bytes.slice(0, out);
}

export type PhotoResult = { photos: Photo[] } | { cancelled: true } | { error: string };

// Lets the presenter pick up to 20 photos from their library (no camera), shrinks and uploads them into
// their own folder, and returns signed links for everyone in the room.
export async function pickAndUploadPhotos(userId: string, roomId: string): Promise<PhotoResult> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: PHOTOS_MAX,
    orderedSelection: true,
    quality: 1,
    exif: false,
  });
  if (picked.canceled || picked.assets.length === 0) return { cancelled: true };
  const assets = picked.assets.slice(0, PHOTOS_MAX);
  const batch = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const paths: string[] = [];
  try {
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const context = ImageManipulator.manipulate(asset.uri);
      if (asset.width > MAX_WIDTH) context.resize({ width: MAX_WIDTH });
      const image = await context.renderAsync();
      const saved = await image.saveAsync({ compress: QUALITY, format: SaveFormat.JPEG, base64: true });
      if (!saved.base64) throw new Error('no image data');
      const path = `${userId}/${roomId}/${batch}-${i}.jpg`;
      const { error } = await supabase.storage.from('table').upload(path, base64ToBytes(saved.base64), {
        contentType: 'image/jpeg',
        upsert: false,
      });
      if (error) throw error;
      paths.push(path);
      await supabase.from('table_photos').insert({ path, user_id: userId, room_id: roomId });
    }
    const { data, error } = await supabase.storage.from('table').createSignedUrls(paths, LINK_SECONDS);
    if (error || !data) throw error ?? new Error('no links');
    const photos = data
      .map((d, i) => ({ url: d.signedUrl, path: paths[i] }))
      .filter((p): p is Photo => typeof p.url === 'string' && p.url.length > 0);
    return photos.length > 0 ? { photos } : { error: "Your photos didn't upload. Check your connection." };
  } catch {
    return { error: "Your photos didn't upload. Check your connection and try again." };
  }
}
