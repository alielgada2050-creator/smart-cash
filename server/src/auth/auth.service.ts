import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { DatabaseService } from "../database.service";
import { GmailService } from "./gmail.service";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_DELAY_MS = 60 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_VERIFY_ATTEMPTS = 5;

interface ActiveUser {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
}

interface Challenge {
  code_hash: Buffer;
  expires_at: Date;
  attempts: number;
  sent_at: Date;
  send_window_started_at: Date;
  send_count: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpPepper: string;

  constructor(
    private readonly database: DatabaseService,
    private readonly gmail: GmailService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.otpPepper = config.getOrThrow<string>("OTP_PEPPER");
  }

  async requestCode(emailInput: string): Promise<{ message: string }> {
    const email = emailInput.trim().toLowerCase();
    const result = await this.database.query<ActiveUser>(
      `SELECT id, tenant_id, email, full_name
         FROM sk.users
        WHERE lower(email) = $1
          AND is_active = true
          AND status = 'active'
        LIMIT 2`,
      [email],
    );

    if (result.rowCount !== 1) return { message: "If the account is eligible, a code will be sent." };

    const user = result.rows[0];
    const code = String(randomInt(100_000, 1_000_000));
    const now = new Date();
    const codeHash = this.hashCode(email, code);

    const challenge = await this.database.transaction(async (client) => {
      await client.query("DELETE FROM sk.auth_email_otps WHERE expires_at <= now()");
      await client.query(
        "DELETE FROM sk.auth_email_sessions WHERE expires_at <= now() OR revoked_at < now() - interval '30 days'",
      );
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [user.id]);
      const existing = await client.query<Challenge>(
        `SELECT code_hash, expires_at, attempts, sent_at, send_window_started_at, send_count
           FROM sk.auth_email_otps
          WHERE user_id = $1
          FOR UPDATE`,
        [user.id],
      );
      const previous = existing.rows[0];
      if (previous && now.getTime() - previous.sent_at.getTime() < RESEND_DELAY_MS) {
        return "rate_limited" as const;
      }

      const windowStart = previous?.send_window_started_at ?? now;
      const withinWindow = now.getTime() - windowStart.getTime() < SEND_WINDOW_MS;
      const sendCount = withinWindow ? (previous?.send_count ?? 0) + 1 : 1;
      if (sendCount > MAX_SENDS_PER_WINDOW) return "rate_limited" as const;

      await client.query(
        `INSERT INTO sk.auth_email_otps
           (user_id, tenant_id, email, code_hash, expires_at, attempts,
            sent_at, send_window_started_at, send_count)
         VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8)
         ON CONFLICT (user_id) DO UPDATE SET
           tenant_id = EXCLUDED.tenant_id,
           email = EXCLUDED.email,
           code_hash = EXCLUDED.code_hash,
           expires_at = EXCLUDED.expires_at,
           attempts = 0,
           sent_at = EXCLUDED.sent_at,
           send_window_started_at = EXCLUDED.send_window_started_at,
           send_count = EXCLUDED.send_count`,
        [
          user.id,
          user.tenant_id,
          email,
          codeHash,
          new Date(now.getTime() + CODE_TTL_MS),
          now,
          withinWindow ? windowStart : now,
          sendCount,
        ],
      );
      return "sent" as const;
    });

    if (challenge === "rate_limited") {
      return { message: "If the account is eligible, a code will be sent." };
    }

    try {
      await this.gmail.sendLoginCode(email, code);
    } catch {
      await this.database.query("DELETE FROM sk.auth_email_otps WHERE user_id = $1", [user.id]);
      this.logger.error("Login code email delivery failed.");
      throw new ServiceUnavailableException("Email delivery is temporarily unavailable.");
    }

    return { message: "If the account is eligible, a code will be sent." };
  }

  async verifyCode(
    emailInput: string,
    code: string,
  ): Promise<{ accessToken: string; expiresIn: number; user: { id: string; email: string; name: string } }> {
    const email = emailInput.trim().toLowerCase();
    const now = new Date();

    const verified = await this.database.transaction(async (client) => {
      const users = await client.query<ActiveUser>(
        `SELECT id, tenant_id, email, full_name
           FROM sk.users
          WHERE lower(email) = $1
            AND is_active = true
            AND status = 'active'
          LIMIT 2`,
        [email],
      );
      if (users.rowCount !== 1) return null;

      const user = users.rows[0];
      const result = await client.query<Challenge>(
        `SELECT code_hash, expires_at, attempts, sent_at, send_window_started_at, send_count
           FROM sk.auth_email_otps
          WHERE user_id = $1
          FOR UPDATE`,
        [user.id],
      );
      const challenge = result.rows[0];
      if (!challenge || challenge.expires_at <= now || challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
        await client.query("DELETE FROM sk.auth_email_otps WHERE user_id = $1", [user.id]);
        return null;
      }

      const suppliedHash = this.hashCode(email, code);
      const matches =
        challenge.code_hash.length === suppliedHash.length &&
        timingSafeEqual(challenge.code_hash, suppliedHash);
      if (!matches) {
        const attempts = challenge.attempts + 1;
        if (attempts >= MAX_VERIFY_ATTEMPTS) {
          await client.query("DELETE FROM sk.auth_email_otps WHERE user_id = $1", [user.id]);
        } else {
          await client.query(
            "UPDATE sk.auth_email_otps SET attempts = $2 WHERE user_id = $1",
            [user.id, attempts],
          );
        }
        return null;
      }

      const sessionId = randomUUID();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
      await client.query(
        `INSERT INTO sk.auth_email_sessions (id, tenant_id, user_id, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [sessionId, user.tenant_id, user.id, expiresAt],
      );
      await client.query("DELETE FROM sk.auth_email_otps WHERE user_id = $1", [user.id]);
      return { user, sessionId, expiresAt };
    });

    if (!verified) throw new UnauthorizedException("The code is invalid or expired.");

    const accessToken = await this.jwt.signAsync({
      sub: verified.user.id,
      tenantId: verified.user.tenant_id,
      email: verified.user.email,
      jti: verified.sessionId,
    });
    return {
      accessToken,
      expiresIn: 900,
      user: {
        id: verified.user.id,
        email: verified.user.email,
        name: verified.user.full_name,
      },
    };
  }

  async getSession(token: string): Promise<{ id: string; tenantId: string; email: string; name: string }> {
    const payload = await this.verifyToken<{
      sub: string;
      tenantId: string;
      email: string;
      jti: string;
    }>(token);
    const result = await this.database.query<ActiveUser>(
      `SELECT u.id, u.tenant_id, u.email, u.full_name
         FROM sk.auth_email_sessions s
         JOIN sk.users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
        WHERE s.id = $1
          AND s.user_id = $2
          AND s.tenant_id = $3
          AND s.revoked_at IS NULL
          AND s.expires_at > now()
          AND u.is_active = true
          AND u.status = 'active'`,
      [payload.jti, payload.sub, payload.tenantId],
    );
    const user = result.rows[0];
    if (!user || user.email.toLowerCase() !== payload.email.toLowerCase()) {
      throw new UnauthorizedException("Session is invalid or expired.");
    }
    return { id: user.id, tenantId: user.tenant_id, email: user.email, name: user.full_name };
  }

  async revokeSession(token: string): Promise<void> {
    const payload = await this.verifyToken<{ jti: string; sub: string }>(token);
    await this.database.query(
      `UPDATE sk.auth_email_sessions
          SET revoked_at = now()
        WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [payload.jti, payload.sub],
    );
  }

  private hashCode(email: string, code: string): Buffer {
    return createHmac("sha256", this.otpPepper).update(`${email}:${code}`).digest();
  }

  private async verifyToken<T extends { sub: string }>(token: string): Promise<T> {
    try {
      return await this.jwt.verifyAsync<T>(token);
    } catch {
      throw new UnauthorizedException("Session is invalid or expired.");
    }
  }
}
