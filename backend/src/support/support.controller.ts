import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  createTicket(@Request() req: ExpressRequest, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(req.userProfile.id, dto);
  }

  @Get('tickets')
  getMyTickets(@Request() req: ExpressRequest) {
    return this.supportService.findByUserProfileId(req.userProfile.id);
  }

  @Post('tickets/:id/messages')
  addMessage(
    @Request() req: ExpressRequest,
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.supportService.addMessage(
      ticketId,
      req.userProfile.authUserId,
      req.userProfile.id,
      dto,
    );
  }

  @Get('tickets/:id/messages')
  getMessages(@Request() req: ExpressRequest, @Param('id', ParseUUIDPipe) ticketId: string) {
    return this.supportService.getMessages(ticketId, req.userProfile.id);
  }
}
