require('dotenv').config();

const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.uploadImage = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'products',
      resource_type: 'auto'
    });
    return result.secure_url;
  } finally {
    // อัปขึ้น Cloudinary แล้ว ไม่ต้องเก็บไฟล์ในเครื่อง (เดิมค้างใน uploads/ จนพื้นที่เต็ม)
    fs.promises.unlink(file.path).catch(() => {});
  }
};

// https://res.cloudinary.com/<cloud>/image/upload/v123/products/abc.jpg → products/abc
exports.getPublicIdFromUrl = (url) => {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) return null;
  const match = url.match(/\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(products\/[^.]+)\.[a-z0-9]+$/i);
  return match ? match[1] : null;
};

// ลบรูปเก่า — ลบไม่สำเร็จไม่ทำให้การบันทึกสินค้าล้ม
exports.deleteImageByUrl = async (url) => {
  const publicId = exports.getPublicIdFromUrl(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('Cloudinary delete failed:', publicId, err.message);
  }
};

exports.deleteImage = async (publicId) => {
  await cloudinary.uploader.destroy(publicId);
};