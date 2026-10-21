import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Kafka, KafkaConfig } from 'kafkajs';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'KAFKA_CLIENT',
      useFactory: (configService: ConfigService) => {
        const kafkaConfig: KafkaConfig = {
          clientId: configService.get('KAFKA_CLIENT_ID') || 'grameen-ride-service',
          brokers: (configService.get('KAFKA_BROKERS') || 'localhost:9092').split(','),
          retry: {
            retries: parseInt(configService.get('KAFKA_RETRY_ATTEMPTS') || '3'),
            initialRetryTime: 100,
          },
        };
        
        return new Kafka(kafkaConfig);
      },
      inject: [ConfigService],
    },
    {
      provide: 'KAFKA_PRODUCER',
      useFactory: async (kafkaClient: Kafka) => {
        const producer = kafkaClient.producer();
        try {
          await producer.connect();
          return producer;
        } catch (error) {
          console.warn('[Kafka] Broker unavailable, running in local fallback mode:', error.message);
          return {
            connect: async () => {},
            disconnect: async () => {},
            send: async (record: any) => {
              return [];
            },
          };
        }
      },
      inject: ['KAFKA_CLIENT'],
    },
  ],
  exports: ['KAFKA_CLIENT', 'KAFKA_PRODUCER'],
})
export class KafkaModule {}

