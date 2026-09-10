import { Injectable } from '@angular/core';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3UploadResponse {
  success: boolean;
  fileUrl?: string;
  key?: string;
  error?: string;
}

export interface S3DeleteResponse {
  success: boolean;
  error?: string;
}

export interface S3Config {
  bucketName: string;
  region: string;

  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class S3HelperService {
  private s3Client: S3Client | null = null;
  private config: S3Config | null = null;
  private initialized = false;

  constructor() {}

  public initialize(config: S3Config): void {
    this.config = config;

    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken,
      },
    });

    this.initialized = true;
  }

 
  public isInitialized(): boolean {
    return this.initialized;
  }

  public async uploadImage(
    file: File,
    folderPath: string,
    customFileName?: string,
  ): Promise<S3UploadResponse> {
    try {
      if (!this.s3Client || !this.config) {
        throw new Error('S3 service not initialized. Call initialize() first.');
      }

      // Validate file type
      if (!this.isValidImageType(file)) {
        throw new Error('Invalid file type. Only images are allowed.');
      }

      // Generate unique file name
      const fileName = this.generateFileName(file, customFileName);
      const key = folderPath ? `${folderPath}/${fileName}` : fileName;

      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Upload command
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: uint8Array,
        ContentType: file.type,
        // ACL: 'private' // Note: ACL is optional in SDK v3
      });

      await this.s3Client.send(command);

      // Construct file URL
      const fileUrl = `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${key}`;

      return {
        success: true,
        fileUrl: fileUrl,
        key: key,
      };
    } catch (error: any) {
      console.error('Error uploading image to S3:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload image',
      };
    }
  }

  public async uploadMultipleImages(
    files: File[],
    folderPath: string,
  ): Promise<S3UploadResponse[]> {
    const uploadPromises = files.map((file) =>
      this.uploadImage(file, folderPath),
    );
    return Promise.all(uploadPromises);
  }

  public async deleteImage(key: string): Promise<S3DeleteResponse> {
    try {
      if (!this.s3Client || !this.config) {
        throw new Error('S3 service not initialized. Call initialize() first.');
      }

      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Error deleting image from S3:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete image',
      };
    }
  }

 
  public async deleteMultipleImages(
    keys: string[],
  ): Promise<S3DeleteResponse[]> {
    const deletePromises = keys.map((key) => this.deleteImage(key));
    return Promise.all(deletePromises);
  }

 
  public async generateSignedUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      if (!this.s3Client || !this.config) {
        throw new Error('S3 service not initialized. Call initialize() first.');
      }

      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      return {
        success: true,
        url: url,
      };
    } catch (error: any) {
      console.error('Error generating signed URL:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate signed URL',
      };
    }
  }

  public async generateMultipleSignedUrls(
    keys: string[],
    expiresIn: number = 3600,
  ): Promise<Array<{ success: boolean; url?: string; error?: string }>> {
    const urlPromises = keys.map((key) =>
      this.generateSignedUrl(key, expiresIn),
    );
    return Promise.all(urlPromises);
  }

  public async fileExists(key: string): Promise<boolean> {
    try {
      if (!this.s3Client || !this.config) {
        throw new Error('S3 service not initialized. Call initialize() first.');
      }

      const command = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  
  public async getFileMetadata(key: string): Promise<any | null> {
    try {
      if (!this.s3Client || !this.config) {
        throw new Error('S3 service not initialized. Call initialize() first.');
      }

      const command = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      const metadata = await this.s3Client.send(command);
      return metadata;
    } catch (error: any) {
      console.error('Error getting file metadata:', error);
      return null;
    }
  }

  private isValidImageType(file: File): boolean {
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    return validTypes.includes(file.type);
  }

  private generateFileName(file: File, customName?: string): string {
    if (customName) {
      return customName;
    }

    const timestamp = Date.now();
    const uuid = crypto.randomUUID().substring(0, 8);
    const extension = this.getFileExtension(file.name);

    return `image_${timestamp}_${uuid}.${extension}`;
  }

  private getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || 'jpg';
  }

  public getConfig(): S3Config | null {
    return this.config;
  }
}
