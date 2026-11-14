const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  lostItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  foundItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  attributeSimilarity: { type: Number, required: true },
  visualSimilarity: { type: Number, default: null },
  overallSimilarity: { type: Number, required: true },
  matchingReasons: [String],
  matchingMethod: { type: String, enum: ['attributes', 'attributes+visual'], default: 'attributes' },
  status: { type: String, enum: ['suggested', 'accepted', 'rejected'], default: 'suggested' },
}, { timestamps: true });

matchSchema.index({ lostItemId: 1, foundItemId: 1 }, { unique: true });
module.exports = mongoose.model('Match', matchSchema);
