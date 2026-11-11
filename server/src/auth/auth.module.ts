import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GmailService } from "./gmail.service";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          issuer: "smart-cash-auth",
          audience: "smart-cash-api",
          expiresIn: "15m",
        },
        verifyOptions: {
          issuer: "smart-cash-auth",
          audience: "smart-cash-api",
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GmailService, DatabaseService],
  exports: [AuthService, DatabaseService],
})
export class AuthModule {}
