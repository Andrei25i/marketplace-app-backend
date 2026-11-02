import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import cloudinary from "../config/cloudinary";
import { userRoot, userTag } from "../utils/mediaPaths";

export type ResourceType = "image" | "video" | "raw";

export interface UploadedMedia {
  url: string;
  public_id: string;
  resource_type: ResourceType;
  width?: number;
  height?: number;
  bytes: number;
  format?: string;
}

interface UploadParams {
  buffer: Buffer;
  publicId: string;
  resourceType?: ResourceType;
  tags?: string[];
}

const IMAGE_LIMIT = { width: 2048, height: 2048, crop: "limit" };
const MAX_PREFIX_LOOPS = 50;
const RESOURCE_TYPES: ResourceType[] = ["image", "video", "raw"];

const folderOf = (publicId: string) =>
  publicId.slice(0, publicId.lastIndexOf("/"));

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export class MediaService {
  uploadBuffer({
    buffer,
    publicId,
    resourceType = "image",
    tags = [],
  }: UploadParams): Promise<UploadedMedia> {
    const options: UploadApiOptions = {
      public_id: publicId,
      asset_folder: folderOf(publicId),
      resource_type: resourceType,
      overwrite: false,
      tags,
      ...(resourceType === "image" ? { transformation: [IMAGE_LIMIT] } : {}),
    };

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (err, result?: UploadApiResponse) => {
          if (err || !result) return reject(err ?? new Error("UPLOAD_FAILED"));
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type as ResourceType,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            format: result.format,
          });
        },
      );
      stream.end(buffer);
    });
  }

  async deleteByPublicIds(
    publicIds: string[],
    resourceType: ResourceType = "image",
  ): Promise<void> {
    const ids = [...new Set(publicIds.filter(Boolean))];

    for (const batch of chunk(ids, 100)) {
      try {
        const res = await cloudinary.api.delete_resources(batch, {
          resource_type: resourceType,
        });
        for (const [id, status] of Object.entries(res.deleted ?? {})) {
          if (status !== "deleted" && status !== "not_found") {
            console.error(`[media] Nu s-a putut șterge ${id}: ${status}`);
          }
        }
      } catch (err) {
        console.error("[media] delete_resources a eșuat pentru", batch, err);
      }
    }
  }

  async deleteUserFolder(userId: string): Promise<void> {
    const prefix = userRoot(userId);

    for (const resource_type of RESOURCE_TYPES) {
      try {
        for (let i = 0; i < MAX_PREFIX_LOOPS; i++) {
          const res = await cloudinary.api.delete_resources_by_prefix(prefix, {
            resource_type,
          });
          if (!res.partial) break;
        }
        await cloudinary.api.delete_resources_by_tag(userTag(userId), {
          resource_type,
        });
      } catch (err) {
        console.error(
          `[media] Ștergerea (${resource_type}) pentru ${prefix} a eșuat`,
          err,
        );
      }
    }

    try {
      await cloudinary.api.delete_folder(prefix.replace(/\/$/, ""));
    } catch (err) {
      console.warn(`[media] Folderul ${prefix} nu a putut fi șters`, err);
    }
  }

  async deleteAssets(
    items: { public_id: string; resource_type: string }[],
  ): Promise<void> {
    const byType = new Map<ResourceType, string[]>();

    for (const { public_id, resource_type } of items) {
      const type = RESOURCE_TYPES.includes(resource_type as ResourceType)
        ? (resource_type as ResourceType)
        : "image";
      byType.set(type, [...(byType.get(type) ?? []), public_id]);
    }

    for (const [type, ids] of byType) {
      await this.deleteByPublicIds(ids, type);
    }
  }
}
