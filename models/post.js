
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    status: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Replace 'User' with the appropriate model name for the user
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }, // Replace 'User' with the appropriate model name for the user
    created_at: { type: Date, default: Date.now },
  });
module.exports = mongoose.model('Post', postSchema);