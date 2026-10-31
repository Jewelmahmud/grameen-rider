import { IsString, IsOptional, IsUUID, IsIn, MaxLength } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @MaxLength(255)
  subject: string;

  @IsString()
  description: string;

  @IsIn(['trip_issue', 'payment_issue', 'driver_complaint', 'passenger_complaint', 'technical_issue', 'account_issue', 'other'])
  category: string;

  @IsOptional()
  @IsUUID()
  tripId?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;
}
