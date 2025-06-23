const express = require("express");
const { 
  uploadProfileImage, 
  handleProfileImageUpload, 
  getProfileImage, 
  deleteProfileImage 
} = require("../controller/upload.controller");
const path = require('path');
const uploadRouter = express.Router();
// Upload profile image
uploadRouter.post("/upload/profile-image", uploadProfileImage, handleProfileImageUpload);
// Get profile image
uploadRouter.get("/profile-image/:user_id", getProfileImage);
// Delete profile image
uploadRouter.delete("/profile-image/:user_id", deleteProfileImage);
// Serve uploaded files statically
uploadRouter.use('/uploads', express.static(path.join(__dirname, '../uploads')));
module.exports = uploadRouter;
