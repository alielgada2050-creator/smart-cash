import { Controller, Get } from "@nestjs/common";
import { DatabaseService } from "./database.service";

@Controller("health")
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  async check() {
    await this.database.query("SELECT 1");
    return { status: "ok" };
  }
}
