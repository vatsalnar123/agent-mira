const mongoose = require('mongoose');

const comparisonListSchema = new mongoose.Schema({
  propertyId: {
    type: Number,
    required: true
  },
  username: {
    type: String,
    required: true,
    lowercase: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index: unique per user
comparisonListSchema.index({ propertyId: 1, username: 1 }, { unique: true });

module.exports = mongoose.model('ComparisonList', comparisonListSchema);
