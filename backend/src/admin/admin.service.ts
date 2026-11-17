import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../entities/driver.entity';
import { Trip } from '../entities/trip.entity';
import { Promotion } from '../entities/promotion.entity';
import { SupportTicket } from '../entities/support-ticket.entity';
import { VerifyDriverDto } from './dto/verify-driver.dto';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/create-promotion.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
    @InjectRepository(SupportTicket)
    private ticketRepository: Repository<SupportTicket>,
  ) {}

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getStats() {
    const [totalTrips, activeTrips, totalDrivers, pendingDrivers] = await Promise.all([
      this.tripRepository.count(),
      this.tripRepository.count({ where: [{ status: 'in_progress' }, { status: 'searching_driver' }, { status: 'accepted' }] }),
      this.driverRepository.count(),
      this.driverRepository.count({ where: { verificationStatus: 'pending' } }),
    ]);

    const revenueRow = await this.tripRepository
      .createQueryBuilder('t')
      .select('SUM(t.commission_amount)', 'revenue')
      .where('t.status = :status', { status: 'completed' })
      .getRawOne();

    const openTickets = await this.ticketRepository.count({ where: { status: 'open' } });

    return {
      trips: { total: totalTrips, active: activeTrips },
      drivers: { total: totalDrivers, pendingVerification: pendingDrivers },
      revenue: { platform: parseFloat(revenueRow?.revenue ?? '0') || 0 },
      support: { openTickets },
    };
  }

  // ─── Driver verification ──────────────────────────────────────────────────

  async getPendingDrivers(): Promise<Driver[]> {
    return this.driverRepository.find({
      where: { verificationStatus: 'pending' },
      relations: ['userProfile', 'vehicles'],
      order: { createdAt: 'ASC' },
    });
  }

  async verifyDriver(driverId: string, dto: VerifyDriverDto): Promise<Driver> {
    const driver = await this.driverRepository.findOne({ where: { id: driverId } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    await this.driverRepository.update(driverId, {
      verificationStatus: dto.status,
    });

    return this.driverRepository.findOne({ where: { id: driverId } });
  }

  // ─── Promotions ───────────────────────────────────────────────────────────

  async createPromotion(dto: CreatePromotionDto): Promise<Promotion> {
    // Customers' codes are matched in upper case (PromotionsService.validatePromoCode).
    const code = dto.code.trim().toUpperCase();
    const existing = await this.promotionRepository.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException(`Promotion code '${code}' already exists`);
    }

    const promotion = this.promotionRepository.create({
      ...dto,
      code,
      audience: dto.audience ?? 'all',
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
      isActive: dto.isActive ?? true,
      usageCount: 0,
    });
    return this.promotionRepository.save(promotion);
  }

  async getAllPromotions(): Promise<Promotion[]> {
    return this.promotionRepository.find({ order: { createdAt: 'DESC' } });
  }

  /** Edits everything except the code and the usage count. */
  async updatePromotion(promotionId: string, dto: UpdatePromotionDto) {
    const before = await this.promotionRepository.findOne({ where: { id: promotionId } });
    if (!before) throw new NotFoundException('Promotion not found');
    const { validFrom, validUntil, ...rest } = dto;
    const changes: Partial<Promotion> = {
      ...rest,
      ...(validFrom ? { validFrom: new Date(validFrom) } : {}),
      ...(validUntil ? { validUntil: new Date(validUntil) } : {}),
    };
    const from = changes.validFrom ?? before.validFrom;
    const until = changes.validUntil ?? before.validUntil;
    if (from >= until) throw new BadRequestException('validFrom must be before validUntil');
    await this.promotionRepository.update(promotionId, changes);
    return { before, after: await this.promotionRepository.findOne({ where: { id: promotionId } }) };
  }

  async togglePromotion(promotionId: string, isActive: boolean): Promise<Promotion> {
    const promo = await this.promotionRepository.findOne({ where: { id: promotionId } });
    if (!promo) {
      throw new NotFoundException('Promotion not found');
    }
    await this.promotionRepository.update(promotionId, { isActive });
    return this.promotionRepository.findOne({ where: { id: promotionId } });
  }

  // ─── Support tickets ──────────────────────────────────────────────────────

  async getAllTickets(status?: string): Promise<SupportTicket[]> {
    const where = status ? { status: status as SupportTicket['status'] } : {};
    return this.ticketRepository.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['userProfile'],
    });
  }

  async updateTicketStatus(ticketId: string, dto: UpdateTicketStatusDto): Promise<SupportTicket> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const update: Partial<SupportTicket> = { status: dto.status };
    if (dto.resolution) {
      update.resolution = dto.resolution;
    }
    if (dto.status === 'resolved' || dto.status === 'closed') {
      update.resolvedAt = new Date();
    }

    await this.ticketRepository.update(ticketId, update);
    return this.ticketRepository.findOne({ where: { id: ticketId } });
  }
}
