"use server";

import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { getDatabase } from "@/lib/db"; // Import the database connection function

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface UploadResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function uploadImage(formData: FormData): Promise<UploadResponse> {
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;
  const description = formData.get("description") as string | null;

  if (!file || !title || !description) {
    return {
      success: false,
      message: "File, title, and description are required.",
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileKey = `uploads/${randomUUID()}-${file.name}`;
  const bucketName = process.env.AWS_S3_BUCKET_NAME!;
  const url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

  const params: PutObjectCommandInput = {
    Bucket: bucketName,
    Key: fileKey,
    Body: buffer,
    ContentType: file.type,
  };

  const sql = await getDatabase();

  try {
    await s3.send(new PutObjectCommand(params));

    await sql`
      INSERT INTO "Image" (title, url, description, key)
      VALUES (${title}, ${url}, ${description}, ${fileKey});
    `;

    return { success: true, message: "Image uploaded successfully." };
  } catch (error) {
    console.error("S3 Upload or DB Error:", error);
    return { success: false, error: "Failed to upload image." };
  }
}

export async function deleteImage(key: string) {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME!;

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3.send(command);

    const sql = await getDatabase();

    await sql`
      DELETE FROM "Image" WHERE key = ${key};
    `;

    await sql.end();

    return { success: true, message: "Image deleted successfully" };
  } catch (error) {
    console.error("Error deleting image:", error);
    return { success: false, message: "Failed to delete image" };
  }
}
