import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from '../entities/support-ticket.entity';
import { SupportMessage } from '../entities/support-message.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private ticketRepository: Repository<SupportTicket>,
    @InjectRepository(SupportMessage)
    private messageRepository: Repository<SupportMessage>,
  ) {}

  async createTicket(userProfileId: string, dto: CreateTicketDto): Promise<SupportTicket> {
    const ticket = this.ticketRepository.create({
      userProfileId,
      subject: dto.subject,
      description: dto.description,
      category: dto.category as SupportTicket['category'],
      tripId: dto.tripId ?? null,
      priority: (dto.priority ?? 'medium') as SupportTicket['priority'],
      status: 'open',
    });
    return this.ticketRepository.save(ticket);
  }

  async findByUserProfileId(userProfileId: string): Promise<SupportTicket[]> {
    return this.ticketRepository.find({
      where: { userProfileId },
      order: { createdAt: 'DESC' },
    });
  }

  async addMessage(
    ticketId: string,
    senderAuthUserId: string,
    userProfileId: string,
    dto: CreateMessageDto,
  ): Promise<SupportMessage> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }
    if (ticket.userProfileId !== userProfileId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    const msg = this.messageRepository.create({
      ticketId,
      senderAuthUserId,
      message: dto.message,
      attachments: dto.attachments ?? null,
      isInternal: dto.isInternal ?? false,
    });
    return this.messageRepository.save(msg);
  }

  async getMessages(ticketId: string, userProfileId: string): Promise<SupportMessage[]> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }
    if (ticket.userProfileId !== userProfileId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return this.messageRepository.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });
  }
}
