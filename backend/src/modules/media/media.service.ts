import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { Media } from "./entities/media.entity";
import { MediaSource, MediaType } from "../../common/enums";

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media) private readonly mediaRepo: Repository<Media>,
    config: ConfigService,
  ) {
    // Cấu hình Cloudinary 1 lần khi service khởi tạo
    cloudinary.config({
      cloud_name: config.getOrThrow<string>("cloudinary.cloudName"),
      api_key: config.getOrThrow<string>("cloudinary.apiKey"),
      api_secret: config.getOrThrow<string>("cloudinary.apiSecret"),
    });
  }

  async upload(
    file: Express.Multer.File,
    teamId: string,
    userId: string,
  ): Promise<Media> {
    // Đẩy buffer file lên Cloudinary qua stream
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: "marketing-hub" },
        (err, res) => {
          if (err || !res) reject(err ?? new Error("Upload failed"));
          else resolve(res);
        },
      );
      stream.end(file.buffer);
    });

    const isVideo = result.resource_type === "video";
    const media = this.mediaRepo.create({
      teamId,
      uploadedById: userId,
      type: isVideo ? MediaType.VIDEO : MediaType.IMAGE,
      source: MediaSource.UPLOAD,
      url: result.secure_url,
      thumbnailUrl: result.secure_url,
      fileName: file.originalname,
      fileSize: String(result.bytes),
      width: result.width ?? null,
      height: result.height ?? null,
      duration: result.duration ?? null,
    });
    return this.mediaRepo.save(media);
  }
}
