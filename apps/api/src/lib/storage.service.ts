/**
 * Storage Service
 * Handles storage of encrypted chat summaries to S3 and IPFS
 * 
 * Supports:
 * - S3 storage (primary)
 * - IPFS gateway (secondary/backup)
 * 
 * Storage Flow:
 * 1. Encrypt chat summary locally (AES-256-GCM)
 * 2. Upload encrypted data to S3 and/or IPFS
 * 3. Return storage reference (S3 key or IPFS CID)
 * 4. Store reference in smart contract
 */

import logger from './logger';

export interface StorageResult {
  success: boolean;
  reference?: string; // S3 key or IPFS CID
  storageType?: 's3' | 'ipfs';
  url?: string; // Optional: URL to access the stored data
  error?: string;
}

export interface StorageConfig {
  s3Enabled: boolean;
  ipfsEnabled: boolean;
  preferredStorage: 's3' | 'ipfs' | 'both';
}

/**
 * Storage Service Interface
 */
abstract class BaseStorageService {
  abstract upload(data: Buffer | string, filename: string): Promise<StorageResult>;
  abstract download(reference: string): Promise<Buffer | null>;
  abstract delete(reference: string): Promise<boolean>;
  abstract exists(reference: string): Promise<boolean>;
}

/**
 * Object Storage Service (Scaleway Object Storage / S3-compatible)
 * Stores encrypted chat summaries to Scaleway Object Storage or AWS S3
 */
class ObjectStorageService extends BaseStorageService {
  private s3Client: any = null;
  private bucketName: string;
  private region: string;
  private endpoint: string | undefined;
  private enabled: boolean;
  private provider: 'scaleway' | 'aws' | 's3-compatible';

  constructor() {
    super();
    
    // Determine provider (Scaleway only - AWS S3 support removed)
    const scalewayEnabled = process.env.SCALEWAY_OBJECT_STORAGE_ENABLED === 'true';
    
    if (scalewayEnabled) {
      this.provider = 'scaleway';
      this.bucketName = process.env.SCALEWAY_BUCKET_NAME || '';
      this.region = process.env.SCALEWAY_REGION || 'fr-par';
      // Scaleway Object Storage endpoints
      const endpoints: Record<string, string> = {
        'fr-par': 'https://s3.fr-par.scw.cloud',
        'nl-ams': 'https://s3.nl-ams.scw.cloud',
        'pl-waw': 'https://s3.pl-waw.scw.cloud',
      };
      this.endpoint = endpoints[this.region] || endpoints['fr-par'];
      this.enabled = !!this.bucketName;
    } else {
      // Generic S3-compatible storage
      this.provider = 's3-compatible';
      this.bucketName = process.env.OBJECT_STORAGE_BUCKET_NAME || '';
      this.region = process.env.OBJECT_STORAGE_REGION || '';
      this.endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
      this.enabled = !!this.bucketName && !!this.endpoint;
    }
    
    if (this.enabled) {
      this.initializeClient();
    } else {
      logger.warn('Object storage is disabled or not configured');
    }
  }

  private initializeClient() {
    try {
      // Dynamic import to avoid errors if AWS SDK is not installed
      const { S3Client } = require('@aws-sdk/client-s3');
      
      const clientConfig: any = {
        region: this.region,
      };
      
      // Configure endpoint for Scaleway or S3-compatible storage
      if (this.endpoint) {
        clientConfig.endpoint = this.endpoint;
        clientConfig.forcePathStyle = true; // Required for Scaleway and some S3-compatible services
      }
      
      // Configure credentials (Scaleway only - AWS S3 support removed)
      if (this.provider === 'scaleway') {
        // Scaleway uses access key and secret key
        const accessKey = process.env.SCALEWAY_ACCESS_KEY;
        const secretKey = process.env.SCALEWAY_SECRET_KEY;
        
        if (accessKey && secretKey) {
          clientConfig.credentials = {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
          };
        } else {
          logger.warn('Scaleway credentials not found, storage may not work');
        }
      } else {
        // Generic S3-compatible credentials
        const accessKey = process.env.OBJECT_STORAGE_ACCESS_KEY;
        const secretKey = process.env.OBJECT_STORAGE_SECRET_KEY;
        
        if (accessKey && secretKey) {
          clientConfig.credentials = {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
          };
        }
      }
      
      this.s3Client = new S3Client(clientConfig);
      
      logger.info(`Object storage service initialized (${this.provider}, region: ${this.region}${this.endpoint ? `, endpoint: ${this.endpoint}` : ''})`);
    } catch (error) {
      logger.error('Failed to initialize object storage client:', error);
      this.enabled = false;
    }
  }

  async upload(data: Buffer | string, filename: string): Promise<StorageResult> {
    if (!this.enabled || !this.s3Client) {
      return {
        success: false,
        error: 'Object storage is not enabled or configured',
      };
    }

    try {
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      
      const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
      const key = `chat-summaries/${filename}`;
      
      const putObjectParams: any = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'application/octet-stream',
        Metadata: {
          'uploaded-at': new Date().toISOString(),
        },
      };
      
      // Server-side encryption (Scaleway supports SSE, but with different parameter)
      // Scaleway supports SSE but it may be enabled at bucket level
      // We'll rely on client-side encryption (data is already encrypted)
      
      const command = new PutObjectCommand(putObjectParams);
      await this.s3Client.send(command);
      
      logger.info(`File uploaded to ${this.provider}: ${key}`);
      
      const storageUrl = this.endpoint 
        ? `${this.endpoint}/${this.bucketName}/${key}`
        : `s3://${this.bucketName}/${key}`;
      
      return {
        success: true,
        reference: key,
        storageType: 's3', // Keep as 's3' for compatibility (it's S3-compatible)
        url: storageUrl,
      };
    } catch (error: any) {
      logger.error(`${this.provider} upload error:`, error);
      return {
        success: false,
        error: error.message || `${this.provider} upload failed`,
      };
    }
  }

  async download(reference: string): Promise<Buffer | null> {
    if (!this.enabled || !this.s3Client) {
      return null;
    }

    try {
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: reference,
      });

      const response = await this.s3Client.send(command);
      
      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error: any) {
      logger.error(`${this.provider} download error:`, error);
      return null;
    }
  }

  async delete(reference: string): Promise<boolean> {
    if (!this.enabled || !this.s3Client) {
      return false;
    }

    try {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: reference,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      logger.error(`${this.provider} delete error:`, error);
      return false;
    }
  }

  async exists(reference: string): Promise<boolean> {
    if (!this.enabled || !this.s3Client) {
      return false;
    }

    try {
      const { HeadObjectCommand } = require('@aws-sdk/client-s3');
      
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: reference,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      return false;
    }
  }
}

/**
 * IPFS Storage Service
 * Stores encrypted chat summaries to IPFS via gateway
 * Supports multiple IPFS providers (Web3.Storage, Pinata, etc.)
 */
class IPFSStorageService extends BaseStorageService {
  private enabled: boolean;
  private gatewayUrl: string;
  private apiToken?: string;

  constructor() {
    super();
    this.enabled = process.env.IPFS_ENABLED === 'true';
    this.gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs';
    this.apiToken = process.env.IPFS_API_TOKEN;
    
    if (!this.enabled) {
      logger.warn('IPFS storage is disabled');
    }
  }

  async upload(data: Buffer | string, filename: string): Promise<StorageResult> {
    if (!this.enabled) {
      return {
        success: false,
        error: 'IPFS storage is not enabled',
      };
    }

    try {
      // Try Web3.Storage first if API token is provided
      if (process.env.WEB3_STORAGE_TOKEN) {
        return await this.uploadToWeb3Storage(data, filename);
      }
      
      // Try Pinata if API key is provided
      if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY) {
        return await this.uploadToPinata(data, filename);
      }
      
      // Fallback: use local IPFS node or public gateway
      logger.warn('No IPFS provider configured, using fallback');
      return {
        success: false,
        error: 'No IPFS provider configured',
      };
    } catch (error: any) {
      logger.error('IPFS upload error:', error);
      return {
        success: false,
        error: error.message || 'IPFS upload failed',
      };
    }
  }

  private async uploadToWeb3Storage(data: Buffer | string, filename: string): Promise<StorageResult> {
    try {
      // Dynamic import
      const { Web3Storage, File } = require('web3.storage');
      
      const token = process.env.WEB3_STORAGE_TOKEN!;
      const client = new Web3Storage({ token });
      
      const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
      const file = new File([buffer], filename, { type: 'application/octet-stream' });
      
      const cid = await client.put([file], {
        name: filename,
        wrapWithDirectory: false,
      });
      
      logger.info(`File uploaded to IPFS via Web3.Storage: ${cid}`);
      
      return {
        success: true,
        reference: cid,
        storageType: 'ipfs',
        url: `${this.gatewayUrl}/${cid}`,
      };
    } catch (error: any) {
      throw new Error(`Web3.Storage upload failed: ${error.message}`);
    }
  }

  private async uploadToPinata(data: Buffer | string, filename: string): Promise<StorageResult> {
    try {
      const apiKey = process.env.PINATA_API_KEY!;
      const apiSecret = process.env.PINATA_SECRET_KEY!;
      
      const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
      
      // Create FormData
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', buffer, {
        filename,
        contentType: 'application/octet-stream',
      });
      
      // Pinata metadata
      const metadata = JSON.stringify({
        name: filename,
      });
      formData.append('pinataMetadata', metadata);
      
      const options = JSON.stringify({
        cidVersion: 1,
      });
      formData.append('pinataOptions', options);
      
      // Upload to Pinata
      const axios = require('axios');
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            pinata_api_key: apiKey,
            pinata_secret_api_key: apiSecret,
          },
          maxBodyLength: Infinity,
        }
      );
      
      const cid = response.data.IpfsHash;
      logger.info(`File uploaded to IPFS via Pinata: ${cid}`);
      
      return {
        success: true,
        reference: cid,
        storageType: 'ipfs',
        url: `${this.gatewayUrl}/${cid}`,
      };
    } catch (error: any) {
      throw new Error(`Pinata upload failed: ${error.message}`);
    }
  }

  async download(reference: string): Promise<Buffer | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const axios = require('axios');
      const url = reference.startsWith('http') ? reference : `${this.gatewayUrl}/${reference}`;
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      
      return Buffer.from(response.data);
    } catch (error: any) {
      logger.error('IPFS download error:', error);
      return null;
    }
  }

  async delete(reference: string): Promise<boolean> {
    // IPFS is immutable, but we can unpin if using Pinata
    if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY) {
      try {
        const axios = require('axios');
        const apiKey = process.env.PINATA_API_KEY!;
        const apiSecret = process.env.PINATA_SECRET_KEY!;
        
        await axios.delete(`https://api.pinata.cloud/pinning/unpin/${reference}`, {
          headers: {
            pinata_api_key: apiKey,
            pinata_secret_api_key: apiSecret,
          },
        });
        
        return true;
      } catch (error: any) {
        logger.error('IPFS unpin error:', error);
        return false;
      }
    }
    
    // IPFS data cannot be deleted, only unpinned
    return false;
  }

  async exists(reference: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const buffer = await this.download(reference);
      return buffer !== null && buffer.length > 0;
    } catch {
      return false;
    }
  }
}

/**
 * Unified Storage Service
 * Manages both Object Storage (Scaleway/S3) and IPFS storage
 */
class StorageService {
  private objectStorageService: ObjectStorageService;
  private ipfsService: IPFSStorageService;
  private config: StorageConfig;

  constructor() {
    this.objectStorageService = new ObjectStorageService();
    this.ipfsService = new IPFSStorageService();
    this.config = {
      s3Enabled: process.env.SCALEWAY_OBJECT_STORAGE_ENABLED === 'true' || 
                 !!process.env.OBJECT_STORAGE_ENDPOINT,
      ipfsEnabled: process.env.IPFS_ENABLED === 'true',
      preferredStorage: (process.env.STORAGE_PREFERRED as 's3' | 'ipfs' | 'both') || 's3',
    };
  }

  /**
   * Upload encrypted chat summary to storage
   * @param encryptedData Encrypted chat summary (base64 string or Buffer)
   * @param walletAddress Wallet address for unique filename
   * @returns Storage result with reference
   */
  async uploadEncryptedSummary(
    encryptedData: Buffer | string,
    walletAddress: string
  ): Promise<StorageResult> {
    const timestamp = Date.now();
    const filename = `${walletAddress}-${timestamp}.enc`;
    
    // Determine storage strategy
    if (this.config.preferredStorage === 'both') {
      // Upload to both Object Storage and IPFS
      const objectStorageResult = await this.objectStorageService.upload(encryptedData, filename);
      const ipfsResult = await this.ipfsService.upload(encryptedData, filename);
      
      // Return the primary result (Object Storage) but include IPFS as backup
      if (objectStorageResult.success) {
        return {
          ...objectStorageResult,
          reference: `${objectStorageResult.reference}|${ipfsResult.reference || ''}`, // Combined reference
        };
      }
      
      if (ipfsResult.success) {
        return ipfsResult;
      }
      
      return {
        success: false,
        error: 'Both object storage and IPFS uploads failed',
      };
    } else if (this.config.preferredStorage === 'ipfs') {
      const result = await this.ipfsService.upload(encryptedData, filename);
      if (!result.success && this.config.s3Enabled) {
        // Fallback to Object Storage
        return await this.objectStorageService.upload(encryptedData, filename);
      }
      return result;
    } else {
      // Default: Object Storage (Scaleway/S3)
      const result = await this.objectStorageService.upload(encryptedData, filename);
      if (!result.success && this.config.ipfsEnabled) {
        // Fallback to IPFS
        return await this.ipfsService.upload(encryptedData, filename);
      }
      return result;
    }
  }

  /**
   * Download encrypted chat summary from storage
   * @param reference Storage reference (Object Storage key, IPFS CID, or combined)
   */
  async downloadEncryptedSummary(reference: string): Promise<Buffer | null> {
    // Check if it's a combined reference (ObjectStorage|IPFS)
    if (reference.includes('|')) {
      const [objectStorageRef, ipfsRef] = reference.split('|');
      
      // Try Object Storage first
      if (objectStorageRef) {
        const buffer = await this.objectStorageService.download(objectStorageRef);
        if (buffer) return buffer;
      }
      
      // Fallback to IPFS
      if (ipfsRef) {
        return await this.ipfsService.download(ipfsRef);
      }
    }
    
    // Try Object Storage first
    if (this.config.s3Enabled) {
      const buffer = await this.objectStorageService.download(reference);
      if (buffer) return buffer;
    }
    
    // Fallback to IPFS
    if (this.config.ipfsEnabled) {
      return await this.ipfsService.download(reference);
    }
    
    return null;
  }

  /**
   * Delete encrypted chat summary from storage
   */
  async deleteEncryptedSummary(reference: string): Promise<boolean> {
    if (reference.includes('|')) {
      const [objectStorageRef, ipfsRef] = reference.split('|');
      const objectStorageResult = objectStorageRef ? await this.objectStorageService.delete(objectStorageRef) : true;
      const ipfsResult = ipfsRef ? await this.ipfsService.delete(ipfsRef) : true;
      return objectStorageResult && ipfsResult;
    }
    
    // Try both
    const objectStorageResult = await this.objectStorageService.delete(reference);
    const ipfsResult = await this.ipfsService.delete(reference);
    return objectStorageResult || ipfsResult;
  }
}

// Export singleton instance
export const storageService = new StorageService();

