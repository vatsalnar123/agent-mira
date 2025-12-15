const mongoose = require('mongoose');

const SavedPropertySchema = new mongoose.Schema({
  propertyId: {
    type: Number,
    required: true
  },
  username: {
    type: String,
    required: true,
    lowercase: true
  },
  savedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index: unique per user
SavedPropertySchema.index({ propertyId: 1, username: 1 }, { unique: true });

module.exports = mongoose.model('SavedProperty', SavedPropertySchema);
