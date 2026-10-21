import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService {
  private firebaseApp: admin.app.App;

  constructor(private configService: ConfigService) {
    const fcmServerKey = this.configService.get('FCM_SERVER_KEY');
    const fcmProjectId = this.configService.get('FCM_PROJECT_ID');

    if (fcmServerKey && fcmProjectId) {
      try {
        // Only initialize if proper credentials are provided
        // For now, skip initialization if credentials are missing
        
        // this.firebaseApp = admin.initializeApp({
        //   credential: admin.credential.cert({
        //     projectId: fcmProjectId,
        //     // Add your Firebase service account JSON here
        //   }),
        // });
        console.log('FCM not initialized - credentials not provided');
      } catch (error) {
        console.warn('FCM initialization failed:', error);
      }
    } else {
      console.log('FCM not initialized - credentials not configured');
    }
  }

  async sendNotification(data: {
    token: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }): Promise<void> {
    if (!this.firebaseApp) {
      console.warn('FCM not initialized, skipping notification');
      return;
    }

    try {
      await admin.messaging(this.firebaseApp).send({
        token: data.token,
        notification: {
          title: data.title,
          body: data.body,
        },
        data: data.data || {},
      });
    } catch (error) {
      console.error('Failed to send FCM notification:', error);
    }
  }
}

