const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    comment: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Replace 'User' with the appropriate model name for the user
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    created_at: { type: Date, default: Date.now },
  });
module.exports = mongoose.model('Comment', commentSchema);