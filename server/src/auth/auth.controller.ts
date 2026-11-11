import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RequestCodeDto, VerifyCodeDto } from "./auth.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Header("Cache-Control", "no-store, private")
  @Post("request-code")
  requestCode(@Body() body: RequestCodeDto) {
    return this.auth.requestCode(body.email);
  }

  @Header("Cache-Control", "no-store, private")
  @Post("verify-code")
  verifyCode(@Body() body: VerifyCodeDto) {
    return this.auth.verifyCode(body.email, body.code);
  }

  @Header("Cache-Control", "no-store, private")
  @Get("me")
  async me(@Headers("authorization") authorization?: string) {
    return { user: await this.auth.getSession(this.bearerToken(authorization)) };
  }

  @Header("Cache-Control", "no-store, private")
  @Post("logout")
  async logout(@Headers("authorization") authorization?: string) {
    await this.auth.revokeSession(this.bearerToken(authorization));
    return { message: "Signed out." };
  }

  private bearerToken(value?: string): string {
    const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(value ?? "");
    if (!match) throw new UnauthorizedException("A bearer token is required.");
    return match[1];
  }
}
