import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(__dirname, '../../uploads');

const createDirectories = () => {
  const dirs = [
    uploadDir,
    path.join(uploadDir, 'payslips'),
    path.join(uploadDir, 'excel'),
    path.join(uploadDir, 'csv')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createDirectories();

const allowedExtensions = ['.csv', '.xlsx', '.xls'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    let dest = uploadDir;
    if (ext === '.xlsx' || ext === '.xls') {
      dest = path.join(uploadDir, 'excel');
    } else if (ext === '.csv') {
      dest = path.join(uploadDir, 'csv');
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Please upload CSV or Excel files.'), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760')
  }
});
