import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });
  const config = app.get(ConfigService);
  const webOrigin = config.getOrThrow<string>("WEB_ORIGIN");
  const jwtSecret = config.getOrThrow<string>("JWT_SECRET");
  const otpPepper = config.getOrThrow<string>("OTP_PEPPER");
  if (jwtSecret.length < 32 || otpPepper.length < 32 || jwtSecret === otpPepper) {
    throw new Error("JWT_SECRET and OTP_PEPPER must be distinct secrets of at least 32 characters.");
  }
  if (!webOrigin.startsWith("https://") && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(webOrigin)) {
    throw new Error("WEB_ORIGIN must use HTTPS outside local development.");
  }

  app.use(helmet());
  app.enableCors({ origin: webOrigin, methods: ["GET", "POST"], allowedHeaders: ["Content-Type", "Authorization"] });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));

  const port = Number(config.get<string>("PORT") ?? "3000");
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
