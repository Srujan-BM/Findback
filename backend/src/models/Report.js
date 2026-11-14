const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  status: { type: String, enum: ['open', 'reviewed', 'dismissed'], default: 'open', index: true },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
