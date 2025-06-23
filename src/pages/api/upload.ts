import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import multer from "multer";
import { S3Client, PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";

interface CustomError extends Error {
  code?: string;
}
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
// router.use(upload.single("file"));
router.use(
  upload.single("file") as unknown as (req: NextApiRequestWithFile, res: NextApiResponse, next: () => void) => void
);

router.post(async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file provided" });

  const fileExtension = file.originalname.split('.').pop();
  const fileName = `uploads/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

  const params: PutObjectCommandInput = {
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3.send(command);
    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    res.status(200).json({ url, fileName, fileSize: file.size, mimeType: file.mimetype });
  } catch (err) {
  const error = err as CustomError;
  console.error("S3 Upload Error:", error);
  res.status(500).json({
    error: error.message || "Upload failed",
    code: error.code || "UNKNOWN_ERROR"
  });
}
});

router.handler({
  onError: (err, req, res) => {
    const error = err as CustomError;
    console.error("API Error:", error);
    res.status(500).json({ error: `Something went wrong: ${error.message}` });
  },
  onNoMatch: (req, res) => {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default router.handler();
