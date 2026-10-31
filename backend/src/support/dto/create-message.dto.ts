import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  attachments?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
