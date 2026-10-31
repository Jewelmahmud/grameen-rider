import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, EntityManager } from 'typeorm';
import { Promotion } from '../entities/promotion.entity';
import { PromotionUsage } from '../entities/promotion-usage.entity';

export interface ValidatePromoResult {
  promotion: Promotion;
  discountAmount: number;
}

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
    @InjectRepository(PromotionUsage)
    private promotionUsageRepository: Repository<PromotionUsage>,
  ) {}

  async validatePromoCode(
    code: string,
    userProfileId: string,
    tripAmount: number,
    vehicleType?: string,
  ): Promise<ValidatePromoResult> {
    const promotion = await this.promotionRepository.findOne({
      where: { code: code.toUpperCase(), isActive: true },
    });

    if (!promotion) {
      throw new NotFoundException('Promotion code not found or is inactive');
    }

    const now = new Date();
    if (now < promotion.validFrom || now > promotion.validUntil) {
      throw new BadRequestException('Promotion code has expired or is not yet valid');
    }

    if (promotion.usageLimit !== null && promotion.usageCount >= promotion.usageLimit) {
      throw new BadRequestException('Promotion code has reached its usage limit');
    }

    if (Number(promotion.minTripAmount) > 0 && tripAmount < Number(promotion.minTripAmount)) {
      throw new BadRequestException(
        `Minimum trip amount of ${promotion.minTripAmount} BDT required for this promotion`,
      );
    }

    if (
      vehicleType &&
      promotion.applicableVehicleTypes?.length &&
      !promotion.applicableVehicleTypes.includes(vehicleType)
    ) {
      throw new BadRequestException(
        'This promotion is not applicable to the selected vehicle type',
      );
    }

    const userUsageCount = await this.promotionUsageRepository.count({
      where: { promotionId: promotion.id, userProfileId },
    });

    if (userUsageCount >= promotion.userUsageLimit) {
      throw new BadRequestException('You have already used this promotion code');
    }

    const discountAmount = this.computeDiscount(promotion, tripAmount);

    return { promotion, discountAmount };
  }

  async applyPromoCode(
    manager: EntityManager,
    promotionId: string,
    userProfileId: string,
    tripId: string,
    discountAmount: number,
  ): Promise<void> {
    await manager.increment(Promotion, { id: promotionId }, 'usageCount', 1);

    const usage = manager.create(PromotionUsage, {
      promotionId,
      userProfileId,
      tripId,
      discountAmount,
    });
    await manager.save(PromotionUsage, usage);
  }

  async findActivePromotions(vehicleType?: string): Promise<Promotion[]> {
    const now = new Date();

    const query = this.promotionRepository
      .createQueryBuilder('p')
      .where('p.is_active = true')
      .andWhere('p.valid_from <= :now', { now })
      .andWhere('p.valid_until >= :now', { now })
      .andWhere(
        '(p.usage_limit IS NULL OR p.usage_count < p.usage_limit)',
      )
      .orderBy('p.discount_value', 'DESC');

    if (vehicleType) {
      query.andWhere(
        '(p.applicable_vehicle_types IS NULL OR p.applicable_vehicle_types @> :vt::jsonb)',
        { vt: JSON.stringify([vehicleType]) },
      );
    }

    return query.getMany();
  }

  private computeDiscount(promotion: Promotion, tripAmount: number): number {
    let discount: number;

    if (promotion.discountType === 'percentage') {
      discount = (tripAmount * Number(promotion.discountValue)) / 100;
      if (promotion.maxDiscountAmount !== null) {
        discount = Math.min(discount, Number(promotion.maxDiscountAmount));
      }
    } else {
      discount = Number(promotion.discountValue);
    }

    return Math.min(Math.round(discount * 100) / 100, tripAmount);
  }
}
