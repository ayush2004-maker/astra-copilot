import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { AIProviderType } from '../../types/ai';
import { ProviderKeyStatus } from '../../types/settings';

export class CredentialStorage {
  private static instance: CredentialStorage | null = null;
  private filePath: string;
  private fallbackKey: Buffer;

  private constructor() {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    this.filePath = path.join(userDataPath, 'vault.enc');

    // Create machine-bound fallback key
    const machineId = `${os.hostname()}-${os.userInfo().username}-AstraCopilotSalt`;
    this.fallbackKey = crypto.scryptSync(machineId, 'astra_copilot_salt_2026', 32);
  }

  public static getInstance(): CredentialStorage {
    if (!CredentialStorage.instance) {
      CredentialStorage.instance = new CredentialStorage();
    }
    return CredentialStorage.instance;
  }

  private encrypt(plainText: string): string {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const encryptedBuffer = safeStorage.encryptString(plainText);
      return 'dpapi:' + encryptedBuffer.toString('base64');
    }

    // Fallback AES-256-GCM
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.fallbackKey, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `gcm:${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  private decrypt(cipherText: string): string {
    if (cipherText.startsWith('dpapi:')) {
      if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
        throw new Error('OS Secure Storage is currently unavailable');
      }
      const buffer = Buffer.from(cipherText.substring(6), 'base64');
      return safeStorage.decryptString(buffer);
    }

    if (cipherText.startsWith('gcm:')) {
      const parts = cipherText.split(':');
      if (parts.length !== 4) throw new Error('Corrupt vault format');
      const iv = Buffer.from(parts[1], 'hex');
      const authTag = Buffer.from(parts[2], 'hex');
      const encrypted = parts[3];
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.fallbackKey, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }

    throw new Error('Unrecognized ciphertext scheme');
  }

  private loadVault(): Record<string, string> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return {};
      }
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  private saveVault(vault: Record<string, string>): void {
    const raw = JSON.stringify(vault, null, 2);
    fs.writeFileSync(this.filePath, raw, 'utf-8');
  }

  public setApiKey(provider: AIProviderType, apiKey: string): boolean {
    if (!apiKey || apiKey.trim() === '') {
      this.deleteApiKey(provider);
      return true;
    }

    const vault = this.loadVault();
    vault[provider] = this.encrypt(apiKey.trim());
    this.saveVault(vault);
    return true;
  }

  public getApiKey(provider: AIProviderType): string | null {
    const vault = this.loadVault();
    const encrypted = vault[provider];
    if (!encrypted) return null;

    try {
      return this.decrypt(encrypted);
    } catch (err) {
      console.error(`Failed to decrypt key for ${provider}:`, err);
      return null;
    }
  }

  public deleteApiKey(provider: AIProviderType): boolean {
    const vault = this.loadVault();
    if (vault[provider]) {
      delete vault[provider];
      this.saveVault(vault);
    }
    return true;
  }

  public getKeyStatus(): ProviderKeyStatus {
    const vault = this.loadVault();
    return {
      openai: Boolean(vault.openai && vault.openai.length > 0),
      gemini: Boolean(vault.gemini && vault.gemini.length > 0),
      anthropic: Boolean(vault.anthropic && vault.anthropic.length > 0),
    };
  }
}
