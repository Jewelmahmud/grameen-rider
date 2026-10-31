import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from '../entities/driver.entity';
import { Trip } from '../entities/trip.entity';
import { Promotion } from '../entities/promotion.entity';
import { SupportTicket } from '../entities/support-ticket.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Driver, Trip, Promotion, SupportTicket])],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
