import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { PutObjectCommand, S3Client, S3ClientConfig } from '@aws-sdk/client-s3';

import { FileUploadOptions } from './file-upload-options.interface';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly region = 'eu-central-1';
  protected readonly logger = new Logger(S3Service.name);

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = configService.get<string | undefined>('AWS_ACCESS_KEY');
    const secretAccessKey = configService.get<string | undefined>(
      'AWS_SECRET_ACCESS_KEY',
    );

    const clientConfig: S3ClientConfig = {
      region: this.region,
    };

    // Will be present only in dev - in prod are automatically provided by AWS
    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    this.client = new S3Client(clientConfig);
  }

  async upload({ bucket, key, file }: FileUploadOptions) {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file,
        }),
      );
    } catch (err) {
      this.logger.error(
        `Failed to upload file to S3. Key: ${key} Bucket: ${bucket}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  getObjectUrl(bucket: string, key: string) {
    return `https://${bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
