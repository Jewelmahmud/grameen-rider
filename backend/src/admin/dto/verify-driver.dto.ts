import { IsIn, IsOptional, IsString } from 'class-validator';

export class VerifyDriverDto {
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
