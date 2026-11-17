import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Book from a quote. The price comes from the quote; any fare sent by the client is rejected. */
export class CreateTripDto {
  @IsUUID() quoteId: string;
  @IsIn(['cash', 'mobile_money', 'card', 'bank_transfer']) paymentMethod: 'cash' | 'mobile_money' | 'card' | 'bank_transfer';
  @IsOptional() @IsString() @MaxLength(50) promotionCode?: string;
  @IsOptional() @IsString() @MaxLength(500) specialInstructions?: string;
}

export class CancelTripDto {
  @IsOptional() @IsString() @MaxLength(500) cancellationReason?: string;
}
