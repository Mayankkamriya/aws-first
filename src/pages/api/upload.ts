import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Custom request type
interface NextApiRequestWithFile extends NextApiRequest {
  file: Express.Multer.File;
}

// AWS S3 config
const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Multer setup with file size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common image formats
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed!"));
    }
    cb(null, true);
  },
});

// Create router with proper typing
const router = createRouter<NextApiRequestWithFile, NextApiResponse>();

// Apply multer middleware
router.use(upload.single("file"));

router.post(async (req: NextApiRequestWithFile, res: NextApiResponse) => {
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ error: "No file provided" });
  }

  // Generate a more unique filename
  const fileExtension = file.originalname.split('.').pop();
  const fileName = `uploads/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    // Remove ACL parameter completely
  };

  try {
    const command = new PutObjectCommand(params);
    await s3.send(command);
    
    // Construct the public URL
    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    
    console.log("File uploaded successfully:", url);
    res.status(200).json({ 
      url,
      fileName,
      fileSize: file.size,
      mimeType: file.mimetype
    });
  } catch (err: any) {
    console.error("S3 Upload Error:", err);
    res.status(500).json({ 
      error: err.message || "Upload failed",
      code: err.code || "UNKNOWN_ERROR"
    });
  }
});

// Error handling
router.handler({
  onError: (err: any, req: NextApiRequest, res: NextApiResponse) => {
    console.error("API Error:", err);
    res.status(500).json({ error: `Something went wrong: ${err.message}` });
  },
  onNoMatch: (req: NextApiRequest, res: NextApiResponse) => {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default router.handler();
