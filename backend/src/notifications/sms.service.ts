import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendSms(params: { phoneNumber: string; message: string }) {
    const enabled = this.configService.get<string>('BULKSMSBD_ENABLED') === 'true';
    if (!enabled) {
      this.logger.log('BulkSMSBD disabled; skipping SMS send');
      return { success: false, skipped: true, reason: 'disabled' };
    }

    const apiUrl = this.configService.get<string>('BULKSMSBD_API_URL');
    const apiKey = this.configService.get<string>('BULKSMSBD_API_KEY');
    const senderId = this.configService.get<string>('BULKSMSBD_SENDER_ID');
    const clientId = this.configService.get<string>('BULKSMSBD_CLIENT_ID');

    if (!apiUrl || !apiKey || !senderId) {
      throw new Error(
        'BulkSMSBD configuration missing (BULKSMSBD_API_URL / BULKSMSBD_API_KEY / BULKSMSBD_SENDER_ID)',
      );
    }

    const payload = {
      api_key: apiKey,
      senderid: senderId,
      client_id: clientId || undefined,
      number: params.phoneNumber,
      message: params.message,
    };

    const response = await axios.post(apiUrl, payload, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    return {
      success: true,
      raw: response.data || {},
    };
  }
}
