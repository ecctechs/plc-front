const service = require('../services/product.service');
const cloudinary = require('../services/cloudinary.service');
const multer = require('multer');
const path = require('path');
const productLogService = require('../services/productLog.service');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
  req.fileValidationError = 'Only JPG, PNG, WEBP or GIF images are allowed';
  cb(null, false);
};

const upload = multer({ storage, fileFilter });

exports.upload = upload;

exports.getProducts = async (req, res) => {
  try {
    const data = await service.list(req.companyId);
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    if (req.fileValidationError) {
      return res.status(400).json({ message: req.fileValidationError });
    }

    let imageUrl = null;

    if (req.file) {
      imageUrl = await cloudinary.uploadImage(req.file);
    }

    const payload = {
      ...req.body,
      image_path: imageUrl || req.body.image_path,
      company_id: req.companyId
    };

    const data = await service.create(payload);
    res.status(201).json(data);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await service.getById(id, req.companyId);
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    if (req.fileValidationError) {
      return res.status(400).json({ message: req.fileValidationError });
    }

    const { id } = req.params;

    let updateData = { ...req.body };
    let oldImage = null;

    if (req.file) {
      const current = await service.getById(id, req.companyId);
      oldImage = current?.image_path;
      const imageUrl = await cloudinary.uploadImage(req.file);
      updateData.image_path = imageUrl;
    }

    const product = await service.update(id, req.companyId, updateData);
    // เปลี่ยนรูปสำเร็จ → ลบรูปเก่าบน Cloudinary
    if (oldImage && oldImage !== updateData.image_path) await cloudinary.deleteImageByUrl(oldImage);
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await service.getById(id, req.companyId);
    await service.delete(id, req.companyId);
    await cloudinary.deleteImageByUrl(product?.image_path);
    res.json({ success: true, message: 'ลบสินค้าสำเร็จ' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

exports.updatePlcAddresses = async (req, res) => {
  try {
    const data = await service.updatePlcAddresses(req.body, req.companyId);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getPlcAddresses = async (req, res) => {
  try {
    const data = await service.getPlcAddresses(req.companyId);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLatestProductLog = async (req, res) => {
  try {
    const data = await productLogService.getLatest();
    res.json({ success: true, data: data || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};