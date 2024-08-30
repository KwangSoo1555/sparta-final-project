import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";

import { JobsService } from "./jobs.service";
import { JobsController } from "./jobs.controller";

import { JobsEntity } from "src/entities/jobs.entity";
import { UsersEntity } from "src/entities/users.entity";
import { LocalCodesEntity } from "src/entities/local-codes.entity";
import { RedisConfig } from "src/database/redis/redis.config";

@Module({
  imports: [TypeOrmModule.forFeature([JobsEntity, UsersEntity, LocalCodesEntity]), AuthModule],
  controllers: [JobsController],
  providers: [JobsService, RedisConfig],
})
export class JobsModule {}
