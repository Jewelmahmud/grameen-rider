import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { Promotion } from '../entities/promotion.entity';
import { PromotionUsage } from '../entities/promotion-usage.entity';

const now = new Date();
const yesterday = new Date(now.getTime() - 86400000);
const tomorrow = new Date(now.getTime() + 86400000);

const makePromo = (overrides: Partial<Promotion> = {}): Promotion =>
  ({
    id: 'promo-1',
    code: 'SAVE10',
    title: '10% off',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscountAmount: 50,
    minTripAmount: 100,
    validFrom: yesterday,
    validUntil: tomorrow,
    usageLimit: null,
    usageCount: 0,
    userUsageLimit: 1,
    isActive: true,
    applicableVehicleTypes: null,
    ...overrides,
  } as Promotion);

const makeRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('PromotionsService', () => {
  let service: PromotionsService;
  let promoRepo: ReturnType<typeof makeRepo>;
  let usageRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    promoRepo = makeRepo();
    usageRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: getRepositoryToken(Promotion), useValue: promoRepo },
        { provide: getRepositoryToken(PromotionUsage), useValue: usageRepo },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
  });

  describe('validatePromoCode', () => {
    it('should throw NotFoundException for unknown/inactive code', async () => {
      promoRepo.findOne.mockResolvedValue(null);
      await expect(
        service.validatePromoCode('INVALID', 'user-1', 200),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when code is expired', async () => {
      promoRepo.findOne.mockResolvedValue(
        makePromo({ validFrom: yesterday, validUntil: yesterday }),
      );
      await expect(service.validatePromoCode('SAVE10', 'user-1', 200)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when usage limit reached', async () => {
      promoRepo.findOne.mockResolvedValue(makePromo({ usageLimit: 5, usageCount: 5 }));
      await expect(service.validatePromoCode('SAVE10', 'user-1', 200)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when trip amount is below minimum', async () => {
      promoRepo.findOne.mockResolvedValue(makePromo({ minTripAmount: 300 }));
      usageRepo.count.mockResolvedValue(0);
      await expect(service.validatePromoCode('SAVE10', 'user-1', 200)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when vehicle type not applicable', async () => {
      promoRepo.findOne.mockResolvedValue(
        makePromo({ applicableVehicleTypes: ['car', 'car_rental'] }),
      );
      usageRepo.count.mockResolvedValue(0);
      await expect(
        service.validatePromoCode('SAVE10', 'user-1', 200, 'cng'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user already used the code', async () => {
      promoRepo.findOne.mockResolvedValue(makePromo({ userUsageLimit: 1 }));
      usageRepo.count.mockResolvedValue(1);
      await expect(service.validatePromoCode('SAVE10', 'user-1', 200)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return promotion and correct percentage discount', async () => {
      promoRepo.findOne.mockResolvedValue(makePromo());
      usageRepo.count.mockResolvedValue(0);

      const result = await service.validatePromoCode('SAVE10', 'user-1', 200);
      // 10% of 200 = 20, maxDiscountAmount 50 → min(20, 50) = 20
      expect(result.promotion.code).toBe('SAVE10');
      expect(result.discountAmount).toBe(20);
    });

    it('should cap discount at maxDiscountAmount', async () => {
      promoRepo.findOne.mockResolvedValue(makePromo({ discountValue: 50, maxDiscountAmount: 30 }));
      usageRepo.count.mockResolvedValue(0);

      const result = await service.validatePromoCode('SAVE10', 'user-1', 200);
      // 50% of 200 = 100, cap at 30
      expect(result.discountAmount).toBe(30);
    });

    it('should compute fixed discount correctly', async () => {
      promoRepo.findOne.mockResolvedValue(
        makePromo({ discountType: 'fixed', discountValue: 25, maxDiscountAmount: null }),
      );
      usageRepo.count.mockResolvedValue(0);

      const result = await service.validatePromoCode('SAVE10', 'user-1', 200);
      expect(result.discountAmount).toBe(25);
    });

    it('should not discount more than the trip amount', async () => {
      promoRepo.findOne.mockResolvedValue(
        makePromo({ discountType: 'fixed', discountValue: 500, maxDiscountAmount: null, minTripAmount: 0 }),
      );
      usageRepo.count.mockResolvedValue(0);

      const result = await service.validatePromoCode('SAVE10', 'user-1', 50);
      expect(result.discountAmount).toBe(50); // capped at tripAmount
    });
  });

  describe('findActivePromotions', () => {
    it('should query active, non-expired promotions', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([makePromo()]),
      };
      promoRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findActivePromotions();
      expect(mockQb.getMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should filter by vehicleType when provided', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      promoRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findActivePromotions('cng');
      // The vehicleType filter adds an extra andWhere call
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('applicable_vehicle_types'),
        expect.any(Object),
      );
    });
  });
});
