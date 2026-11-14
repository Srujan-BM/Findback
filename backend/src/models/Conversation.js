const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  relatedItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  lastMessageAt: { type: Date, default: Date.now },
}, { timestamps: true });

conversationSchema.index({ participants: 1, relatedItemId: 1 });
module.exports = mongoose.model('Conversation', conversationSchema);
