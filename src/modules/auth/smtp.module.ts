import * as nodemailer from "nodemailer";
import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "./auth.module";

@Module({
  imports: [forwardRef(() => AuthModule), ConfigModule],
  providers: [
    {
      provide: "SMTP_TRANSPORT",
      useFactory: async (configService: ConfigService) => {
        return nodemailer.createTransport({
          host: configService.get("SMTP_HOST"),
          port: configService.get("SMTP_PORT"),
          secure: configService.get("SMTP_SECURE") === "true",
          auth: {
            user: configService.get("SMTP_USER"),
            pass: configService.get("SMTP_PASS"),
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ["SMTP_TRANSPORT"],
})
export class SmtpModule {}
