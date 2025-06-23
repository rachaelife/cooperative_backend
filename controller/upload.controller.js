const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { DB } = require("../sql");
// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});
// Upload profile image
module.exports.uploadProfileImage = upload.single('profileImage');
// Handle profile image upload
module.exports.handleProfileImageUpload = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    // Update user profile with image URL
    DB.query(
      'UPDATE users SET profile_image = ? WHERE user_id = ?',
      [imageUrl, user_id],
      (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Failed to update profile image' });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({
          message: 'Profile image uploaded successfully',
          imageUrl: imageUrl,
          filename: req.file.filename
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};
// Get profile image
module.exports.getProfileImage = (req, res) => {
  try {
    const { user_id } = req.params;
    DB.query(
      'SELECT profile_image FROM users WHERE user_id = ?',
      [user_id],
      (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Failed to get profile image' });
        }
        if (result.length === 0) {
          return res.status(404).json({ message: 'User not found' });
        }
        const profileImage = result[0].profile_image;
        if (!profileImage) {
          return res.status(404).json({ message: 'No profile image found' });
        }
        res.status(200).json({
          message: 'Profile image retrieved successfully',
          imageUrl: profileImage
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Failed to get profile image', error: error.message });
  }
};
// Delete profile image
module.exports.deleteProfileImage = (req, res) => {
  try {
    const { user_id } = req.params;
    // First get the current image path
    DB.query(
      'SELECT profile_image FROM users WHERE user_id = ?',
      [user_id],
      (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Failed to delete profile image' });
        }
        if (result.length === 0) {
          return res.status(404).json({ message: 'User not found' });
        }
        const profileImage = result[0].profile_image;
        // Update database to remove image reference
        DB.query(
          'UPDATE users SET profile_image = NULL WHERE user_id = ?',
          [user_id],
          (updateErr, updateResult) => {
            if (updateErr) {
              return res.status(500).json({ message: 'Failed to delete profile image' });
            }
            // Try to delete the physical file
            if (profileImage) {
              const filePath = path.join(uploadsDir, path.basename(profileImage));
              fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) {
                  // Don't fail the request if file deletion fails
                }
              });
            }
            res.status(200).json({
              message: 'Profile image deleted successfully'
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete profile image', error: error.message });
  }
};
