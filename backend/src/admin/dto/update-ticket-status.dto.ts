import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateTicketStatusDto {
  @IsIn(['open', 'in_progress', 'resolved', 'closed'])
  status: 'open' | 'in_progress' | 'resolved' | 'closed';

  @IsOptional()
  @IsString()
  resolution?: string;
}
