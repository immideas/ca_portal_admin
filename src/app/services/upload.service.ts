import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { S3HelperService } from './s3-helper.service';
import { AuthService } from '../auth.service';
import { UploadType } from '../shared/enums/uploadTypeEnums';
export interface UploadResult {
  key: string;
  previewUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  constructor(
    private s3Helper: S3HelperService,
    private authService: AuthService,
  ) {}

  private awsCredentialsExpiry: Date | null = null;
  private initializationPromise: Promise<void> | null = null;

  private readonly folderMap = {
[UploadType.CATEGORY_IMAGE]: 'category/images',
  [UploadType.COMPLAINT_TYPE_IMAGE]: 'complaint-types/images',
  [UploadType.SUB_CATEGORY_IMAGE]: 'sub-categories/images',
  [UploadType.PROJECT_IMAGE]: 'projects/images',
  [UploadType.ROLE_IMAGE]: 'roles/images',
  [UploadType.ADMIN_IMAGE]: 'admins/images',
  [UploadType.SUB_ADMIN_IMAGE]: 'sub-admins/images',
  [UploadType.MESSAGE_IMAGE]: 'messages/images',
  [UploadType.MESSAGE_TRAIL]:'message_trail_admin/images',
  [UploadType.REOPEN_TICKET]:'reopen_ticket/images',
  [UploadType.CLIENT_KYC]: 'clients/kyc'
  };

  private getFolder(type: UploadType): string {
    return this.folderMap[type];
  }

  private async initializeS3(): Promise<void> {
    const now = new Date();

    if (
      this.s3Helper.isInitialized() &&
      this.awsCredentialsExpiry &&
      now < this.awsCredentialsExpiry
    ) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      const creds = await firstValueFrom(this.authService.getAwsCredentials());

      const expiry = new Date(creds.data.expiration);

      expiry.setMinutes(expiry.getMinutes() - 5);

      this.awsCredentialsExpiry = expiry;

      this.s3Helper.initialize({
        bucketName: creds.data.bucket,
        region: creds.data.region,
        accessKeyId: creds.data.accessKeyId,
        secretAccessKey: creds.data.secretAccessKey,
        sessionToken: creds.data.sessionToken,
      });
    })();

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  async upload(
    file: File,
    type: UploadType,
    customFileName?: string,
  ): Promise<UploadResult> {
    await this.initializeS3();

    const folder = this.getFolder(type);

    const response = await this.s3Helper.uploadImage(
      file,
      folder,
      customFileName,
    );

    if (!response.success || !response.key) {
      throw new Error(response.error || 'Upload failed');
    }

    const registerResponse = await firstValueFrom(
      this.authService.registerTemporaryImage({
        file_key: response.key,
        upload_type: type,
      }),
    );

    const signedUrlResponse = await this.s3Helper.generateSignedUrl(
      response.key,
    );

    return {
      key: response.key,
      previewUrl: signedUrlResponse.url || '',
    };
  }

  async delete(key: string): Promise<void> {
    await this.initializeS3();

    const response = await this.s3Helper.deleteImage(key);

    if (!response.success) {
      throw new Error(response.error || 'Delete failed');
    }
  }

  async getPreviewUrl(key: string): Promise<string> {
    await this.initializeS3();

    const response = await this.s3Helper.generateSignedUrl(key);

    return response.url || '';
  }
}
