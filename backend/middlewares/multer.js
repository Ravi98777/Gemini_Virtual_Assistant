// import multer from "multer"
// const storage = multer.diskStorage({
//     destination :(req,file,cb)=>{
//         cb(null,"./public")
//     },
//     filename : (req,file,cb)=>{
//         cb(null,file.originalname)

//     }
// })

// const upload = multer({storage})
// export default upload




import fs from "node:fs";
import path from "node:path";
import multer from "multer";

const uploadDirectory = path.resolve("public");

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    fs.mkdir(uploadDirectory, { recursive: true }, (error) => {
      callback(error, uploadDirectory);
    });
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, uniqueName);
  },
});

const fileFilter = (req, file, callback) => {
  if (!file.mimetype.startsWith("image/")) {
    return callback(new Error("Only image files are allowed"));
  }

  callback(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export default upload;
