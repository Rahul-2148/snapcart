import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

type CloudinaryResponse = {
  url: string;
  publicId: string;
};

const uploadOnCloudinary = async (
  file: File,
  folder: string
): Promise<CloudinaryResponse | null> => {
  if (!file || file.size === 0) return null;

  const buffer = Buffer.from(await file.arrayBuffer());

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: "image",
          public_id: `${Date.now()}-${file.name}`,
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return resolve(null);

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      )
      .end(buffer);
  });
};


export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  if (!publicId) return false;

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    return false;
  }
};

export default uploadOnCloudinary;
