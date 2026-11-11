import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GmailService {
  private readonly sender: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly refreshToken: string;

  constructor(config: ConfigService) {
    this.sender = config.getOrThrow<string>("GMAIL_USER");
    this.clientId = config.getOrThrow<string>("GMAIL_CLIENT_ID");
    this.clientSecret = config.getOrThrow<string>("GMAIL_CLIENT_SECRET");
    this.refreshToken = config.getOrThrow<string>("GMAIL_REFRESH_TOKEN");
  }

  async sendLoginCode(email: string, code: string): Promise<void> {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok) throw new ServiceUnavailableException("Gmail authorization failed.");
    const token = (await tokenResponse.json()) as { access_token?: string };
    if (!token.access_token) throw new ServiceUnavailableException("Gmail did not issue an access token.");

    const mime = [
      `From: ${this.sender}`,
      `To: ${email}`,
      "Subject: Smart Cash sign-in code",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      `Your Smart Cash sign-in code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    ].join("\r\n");
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: Buffer.from(mime, "utf8").toString("base64url") }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new ServiceUnavailableException("Gmail could not send the sign-in code.");
  }
}
