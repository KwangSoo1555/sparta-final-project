import { Module } from "@nestjs/common";
import { TypeOrmModule as NestTypeOrmModule } from "@nestjs/typeorm";
import { JwtModule as NestJwtModule } from "@nestjs/jwt";
import {
  AccessTokenStrategy,
  AccessTokenWsStrategy,
  RefreshTokenStrategy,
} from "./strategies/jwt-strategy";
import {
  GooglePassportStrategy,
  NaverPassportStrategy,
  KakaoPassportStrategy,
} from "./strategies/social-strategy";

import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";

import { UsersEntity } from "src/entities/users.entity";
import { RefreshTokensEntity } from "src/entities/refresh-tokens.entity";
import * as nodemailer from 'nodemailer';

@Module({
  imports: [
    NestTypeOrmModule.forFeature([UsersEntity, RefreshTokensEntity]),
    NestJwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("ACCESS_TOKEN_SECRET"),
      }),
      inject: [ConfigService],
    }),
    NestJwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("REFRESH_TOKEN_SECRET"),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenStrategy,
    AccessTokenWsStrategy,
    RefreshTokenStrategy,
    GooglePassportStrategy,
    NaverPassportStrategy,
    KakaoPassportStrategy,
    {
      provide: 'SMTP_TRANSPORT',
      useFactory: async (configService: ConfigService) => {
        return nodemailer.createTransport({
          service: 'naver',
          auth: {
            user: configService.get<string>('MAIL_AUTH_USER'),
            pass: configService.get<string>('MAIL_AUTH_PASS'),
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, AccessTokenStrategy, RefreshTokenStrategy],
})
export class AuthModule {}
