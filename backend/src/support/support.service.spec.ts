import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportTicket } from '../entities/support-ticket.entity';
import { SupportMessage } from '../entities/support-message.entity';

const makeTicket = (overrides: Partial<SupportTicket> = {}): SupportTicket =>
  ({
    id: 'ticket-1',
    userProfileId: 'user-1',
    subject: 'Test issue',
    description: 'Desc',
    category: 'trip_issue',
    status: 'open',
    priority: 'medium',
    tripId: null,
    assignedToAuthUserId: null,
    resolution: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SupportTicket);

const makeRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

describe('SupportService', () => {
  let service: SupportService;
  let ticketRepo: ReturnType<typeof makeRepo>;
  let messageRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    ticketRepo = makeRepo();
    messageRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: getRepositoryToken(SupportTicket), useValue: ticketRepo },
        { provide: getRepositoryToken(SupportMessage), useValue: messageRepo },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  describe('createTicket', () => {
    it('should create and return a ticket', async () => {
      const ticket = makeTicket();
      ticketRepo.create.mockReturnValue(ticket);
      ticketRepo.save.mockResolvedValue(ticket);

      const result = await service.createTicket('user-1', {
        subject: 'Test issue',
        description: 'Desc',
        category: 'trip_issue',
      });

      expect(ticketRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userProfileId: 'user-1', status: 'open' }),
      );
      expect(result).toEqual(ticket);
    });
  });

  describe('findByUserProfileId', () => {
    it('should return tickets ordered by createdAt desc', async () => {
      const tickets = [makeTicket(), makeTicket({ id: 'ticket-2' })];
      ticketRepo.find.mockResolvedValue(tickets);

      const result = await service.findByUserProfileId('user-1');

      expect(ticketRepo.find).toHaveBeenCalledWith({
        where: { userProfileId: 'user-1' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(tickets);
    });
  });

  describe('addMessage', () => {
    it('should throw NotFoundException if ticket does not exist', async () => {
      ticketRepo.findOne.mockResolvedValue(null);
      await expect(
        service.addMessage('bad-id', 'auth-1', 'user-1', { message: 'Hi' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own ticket', async () => {
      ticketRepo.findOne.mockResolvedValue(makeTicket({ userProfileId: 'other-user' }));
      await expect(
        service.addMessage('ticket-1', 'auth-1', 'user-1', { message: 'Hi' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create and return a message for the ticket owner', async () => {
      const ticket = makeTicket();
      const msg = { id: 'msg-1', ticketId: 'ticket-1', message: 'Hi' };
      ticketRepo.findOne.mockResolvedValue(ticket);
      messageRepo.create.mockReturnValue(msg);
      messageRepo.save.mockResolvedValue(msg);

      const result = await service.addMessage('ticket-1', 'auth-1', 'user-1', { message: 'Hi' });
      expect(result).toEqual(msg);
    });
  });

  describe('getMessages', () => {
    it('should throw NotFoundException if ticket not found', async () => {
      ticketRepo.findOne.mockResolvedValue(null);
      await expect(service.getMessages('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own ticket', async () => {
      ticketRepo.findOne.mockResolvedValue(makeTicket({ userProfileId: 'other' }));
      await expect(service.getMessages('ticket-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should return messages for ticket owner', async () => {
      const ticket = makeTicket();
      const msgs = [{ id: 'msg-1' }, { id: 'msg-2' }];
      ticketRepo.findOne.mockResolvedValue(ticket);
      messageRepo.find.mockResolvedValue(msgs);

      const result = await service.getMessages('ticket-1', 'user-1');
      expect(result).toEqual(msgs);
    });
  });
});
