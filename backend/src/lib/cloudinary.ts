import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'paperrentel_ids',
      resource_type: 'image',
      // 'private' strictly requires a signed URL to view, blocking public access.
      type: 'private',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
    };
  }
});
const evidenceStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'paperrentel_evidence',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
    };
  }
});

// Multer configurations with 5MB file size limit and a basic mimetype filter
const multerConfig = {
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req: any, file: any, cb: any) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WEBP files are allowed.'));
    }
    cb(null, true);
  }
};

export const uploadID = multer({ storage, ...multerConfig });
export const uploadEvidence = multer({ storage: evidenceStorage, ...multerConfig });
export { cloudinary };
