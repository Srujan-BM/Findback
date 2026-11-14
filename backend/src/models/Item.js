const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reportType: { type: String, enum: ['lost', 'found'], required: true, index: true },
  itemName: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, required: true, trim: true, maxlength: 60, index: true },
  brand: { type: String, trim: true, maxlength: 80 },
  color: { type: String, trim: true, maxlength: 50, index: true },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  distinctiveFeatures: { type: String, trim: true, maxlength: 1000, select: false },
  location: { type: String, required: true, trim: true, maxlength: 160 },
  reportDate: { type: Date, required: true, index: true },
  images: [{ url: String, publicId: String, originalName: String }],
  imageEmbeddings: { type: [[Number]], default: undefined, select: false },
  privateVerificationData: { type: String, trim: true, maxlength: 1000, select: false },
  status: {
    type: String,
    enum: ['ACTIVE', 'MATCH_FOUND', 'CLAIM_PENDING', 'CLAIM_RECEIVED', 'VERIFIED', 'RETURNED', 'RECOVERED', 'CLOSED', 'EXPIRED', 'DISPUTED', 'REJECTED'],
    default: 'ACTIVE',
    index: true,
  },
}, { timestamps: true });

itemSchema.index({ itemName: 'text', description: 'text', location: 'text', brand: 'text', color: 'text' });

module.exports = mongoose.model('Item', itemSchema);
