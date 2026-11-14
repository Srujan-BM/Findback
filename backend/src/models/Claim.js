const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
  claimantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  finderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  verificationAnswers: { type: String, required: true, trim: true, maxlength: 1000, select: false },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'more_info'], default: 'pending', index: true },
  comments: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

module.exports = mongoose.model('Claim', claimSchema);
