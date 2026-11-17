import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { DISPATCH_QUEUE, DispatchJob, DispatchService } from './dispatch.service';

@Processor(DISPATCH_QUEUE)
export class DispatchProcessor {
  private readonly logger = new Logger(DispatchProcessor.name);

  constructor(private readonly dispatch: DispatchService) {}

  @Process({ concurrency: 10 })
  async handle(job: Job<DispatchJob>) {
    try {
      if (job.data.kind === 'next') await this.dispatch.next(job.data.tripId);
      else await this.dispatch.handleTimeout(job.data.offerId);
    } catch (error) {
      this.logger.error(`Dispatch job ${job.id} (${job.data.kind}) failed`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }
}
