import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Driver } from '../entities/driver.entity';
import { Trip } from '../entities/trip.entity';
import { Promotion } from '../entities/promotion.entity';
import { SupportTicket } from '../entities/support-ticket.entity';

const makeRepo = () => ({
  count: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const makeDriver = (overrides: Partial<Driver> = {}): Driver =>
  ({ id: 'd-1', verificationStatus: 'pending', ...overrides } as Driver);

const makePromo = (overrides: Partial<Promotion> = {}): Promotion =>
  ({ id: 'p-1', code: 'SAVE10', isActive: true, usageCount: 0, ...overrides } as Promotion);

const makeTicket = (overrides: Partial<SupportTicket> = {}): SupportTicket =>
  ({ id: 't-1', status: 'open', ...overrides } as SupportTicket);

describe('AdminService', () => {
  let service: AdminService;
  let driverRepo: ReturnType<typeof makeRepo>;
  let tripRepo: ReturnType<typeof makeRepo>;
  let promoRepo: ReturnType<typeof makeRepo>;
  let ticketRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    driverRepo = makeRepo();
    tripRepo = makeRepo();
    promoRepo = makeRepo();
    ticketRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Driver), useValue: driverRepo },
        { provide: getRepositoryToken(Trip), useValue: tripRepo },
        { provide: getRepositoryToken(Promotion), useValue: promoRepo },
        { provide: getRepositoryToken(SupportTicket), useValue: ticketRepo },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('verifyDriver', () => {
    it('should throw NotFoundException for unknown driver', async () => {
      driverRepo.findOne.mockResolvedValue(null);
      await expect(service.verifyDriver('bad', { status: 'approved' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should approve a driver', async () => {
      const driver = makeDriver();
      const approved = makeDriver({ verificationStatus: 'approved' });
      driverRepo.findOne.mockResolvedValueOnce(driver).mockResolvedValueOnce(approved);
      driverRepo.update.mockResolvedValue(undefined);

      const result = await service.verifyDriver('d-1', { status: 'approved' });
      expect(driverRepo.update).toHaveBeenCalledWith('d-1', { verificationStatus: 'approved' });
      expect(result.verificationStatus).toBe('approved');
    });
  });

  describe('createPromotion', () => {
    const dto = {
      code: 'NEW10',
      title: '10% off',
      discountType: 'percentage' as const,
      discountValue: 10,
      validFrom: '2026-11-01',
      validUntil: '2026-11-30',
    };

    it('should throw ConflictException for duplicate code', async () => {
      promoRepo.findOne.mockResolvedValue(makePromo({ code: 'NEW10' }));
      await expect(service.createPromotion(dto)).rejects.toThrow(ConflictException);
    });

    it('should create promotion successfully', async () => {
      const promo = makePromo({ code: 'NEW10' });
      promoRepo.findOne.mockResolvedValue(null);
      promoRepo.create.mockReturnValue(promo);
      promoRepo.save.mockResolvedValue(promo);

      const result = await service.createPromotion(dto);
      expect(promoRepo.save).toHaveBeenCalled();
      expect(result.code).toBe('NEW10');
    });
  });

  describe('togglePromotion', () => {
    it('should throw NotFoundException for unknown promotion', async () => {
      promoRepo.findOne.mockResolvedValue(null);
      await expect(service.togglePromotion('bad', false)).rejects.toThrow(NotFoundException);
    });

    it('should deactivate a promotion', async () => {
      const promo = makePromo();
      const deactivated = makePromo({ isActive: false });
      promoRepo.findOne.mockResolvedValueOnce(promo).mockResolvedValueOnce(deactivated);
      promoRepo.update.mockResolvedValue(undefined);

      const result = await service.togglePromotion('p-1', false);
      expect(promoRepo.update).toHaveBeenCalledWith('p-1', { isActive: false });
      expect(result.isActive).toBe(false);
    });
  });

  describe('updateTicketStatus', () => {
    it('should throw NotFoundException for unknown ticket', async () => {
      ticketRepo.findOne.mockResolvedValue(null);
      await expect(service.updateTicketStatus('bad', { status: 'resolved' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set resolvedAt when status is resolved', async () => {
      const ticket = makeTicket();
      const resolved = makeTicket({ status: 'resolved', resolvedAt: new Date() });
      ticketRepo.findOne.mockResolvedValueOnce(ticket).mockResolvedValueOnce(resolved);
      ticketRepo.update.mockResolvedValue(undefined);

      const result = await service.updateTicketStatus('t-1', { status: 'resolved' });
      const updateCall = ticketRepo.update.mock.calls[0][1];
      expect(updateCall.resolvedAt).toBeInstanceOf(Date);
      expect(result.status).toBe('resolved');
    });
  });

  describe('getPendingDrivers', () => {
    it('should return drivers with pending verification status', async () => {
      const drivers = [makeDriver(), makeDriver({ id: 'd-2' })];
      driverRepo.find.mockResolvedValue(drivers);

      const result = await service.getPendingDrivers();
      expect(driverRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { verificationStatus: 'pending' } }),
      );
      expect(result).toHaveLength(2);
    });
  });
});
