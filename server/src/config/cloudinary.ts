import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbse5jzus',
  api_key: process.env.CLOUDINARY_API_KEY || '173768342559143',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'c2SAcMIXxsoqB5BxV6uVCMyWUxs',
  secure: true,
});

export default cloudinary;
