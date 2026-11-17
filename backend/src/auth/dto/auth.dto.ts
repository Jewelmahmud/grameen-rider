import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class LoginDto {
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(128) password?: string;
  /** OTP from /auth/otp/send, or the authenticator code on MFA accounts. */
  @IsOptional() @IsString() @MaxLength(16) mfaCode?: string;
}

export class SendOtpDto {
  @IsString() @IsNotEmpty() @MaxLength(20) phone: string;
  @IsOptional() @IsIn(['login']) purpose?: 'login';
}

export const SELF_REGISTRATION_ROLES = ['customer', 'grameen_ride_driver'] as const;

export class RegisterDto {
  @IsIn(SELF_REGISTRATION_ROLES) roleName: (typeof SELF_REGISTRATION_ROLES)[number];
  @IsString() @IsNotEmpty() @MaxLength(20) phone: string;
  @IsString() @Length(8, 128) password: string;
  @IsString() @IsNotEmpty() @MaxLength(100) firstName: string;
  @IsString() @IsNotEmpty() @MaxLength(100) lastName: string;
  @IsOptional() @IsEmail() email?: string;
}

export class VerifyPhoneDto {
  @IsString() @IsNotEmpty() @MaxLength(20) phone: string;
  @IsString() @Length(4, 8) code: string;
}

export class ResendVerificationDto {
  @IsIn(['phone', 'email']) type: 'phone' | 'email';
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsEmail() email?: string;
}

export class RefreshDto {
  @IsString() @IsNotEmpty() refreshToken: string;
}

export class LogoutDto {
  @IsOptional() @IsString() refreshToken?: string;
}
