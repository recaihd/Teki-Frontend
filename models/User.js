const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    username: { type: String, unique: true, sparse: true }
});

module.exports = mongoose.model("User", UserSchema);
