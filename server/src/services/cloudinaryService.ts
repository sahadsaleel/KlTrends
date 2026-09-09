import cloudinary from '../config/cloudinary.js';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

const normalizeImagePayload = (value: string): string => {
  const payload = value.trim();
  if (payload.length > 2_000_000) throw new Error('Image payload is too large.');
  if (!payload.startsWith('data:image/')) {
    throw new Error('Only image data uploads are supported.');
  }
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(payload)) {
    throw new Error('Unsupported or invalid image format.');
  }
  return payload;
};

/**
 * Uploads employee attendance selfie to Cloudinary folder
 * @param imageBase64OrUri Base64 data string, data URI, or URL
 * @param employeeIdentifier Identifier used for Cloudinary asset tagging
 */
export const uploadAttendanceSelfie = async (
  imageBase64OrUri: string,
  employeeIdentifier: string
): Promise<CloudinaryUploadResult> => {
  try {
    if (!imageBase64OrUri || typeof imageBase64OrUri !== 'string' || imageBase64OrUri.trim().length === 0) {
      throw new Error('No selfie image provided for verification.');
    }

    const folder = process.env.CLOUDINARY_FOLDER || 'kltrends/attendance_selfies';

    const uploadPayload = normalizeImagePayload(imageBase64OrUri);

    const result = await cloudinary.uploader.upload(uploadPayload, {
      folder,
      tags: ['attendance', 'check-in', 'selfie', employeeIdentifier],
      transformation: [
        { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error: any) {
    console.error('[CloudinaryService] Failed to upload selfie:', error);
    throw new Error(error.message || 'Failed to upload selfie image to Cloudinary');
  }
};

/**
 * Uploads user or employee profile picture to Cloudinary folder
 * @param imageBase64OrUri Base64 data string, data URI, or URL
 * @param userIdentifier Identifier used for Cloudinary asset tagging
 */
export const uploadProfileImage = async (
  imageBase64OrUri: string,
  userIdentifier: string
): Promise<CloudinaryUploadResult> => {
  try {
    if (!imageBase64OrUri || typeof imageBase64OrUri !== 'string' || imageBase64OrUri.trim().length === 0) {
      throw new Error('No profile image provided for upload.');
    }

    const folder = 'kltrends/profile_images';

    const uploadPayload = normalizeImagePayload(imageBase64OrUri);

    const result = await cloudinary.uploader.upload(uploadPayload, {
      folder,
      tags: ['profile', 'photo', userIdentifier],
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face', quality: 'auto:good' },
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error: any) {
    console.error('[CloudinaryService] Failed to upload profile image:', error);
    throw new Error(error.message || 'Failed to upload profile image to Cloudinary');
  }
};
