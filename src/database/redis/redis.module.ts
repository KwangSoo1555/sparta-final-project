import { Module, Global } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { RedisConfig } from "../redis/redis.config";
import { RedisPubsubService } from "../redis/redis-pubsub.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: "REDIS_CLIENT",
      useFactory: (configService: ConfigService) => {
        const redisConfig = new RedisConfig(configService);
        return redisConfig.getClient();
      },
      inject: [ConfigService],
    },
    {
      provide: "REDIS_SUBSCRIBER_CLIENT",
      useFactory: (configService: ConfigService) => {
        const redisConfig = new RedisConfig(configService);
        return redisConfig.getClient();
      },
      inject: [ConfigService],
    },
    RedisPubsubService,
    {
      provide: "REDIS_PUB_SUB_TOKEN",
      useValue: new RedisPubsubService(),
    },
    RedisConfig,
  ],
  exports: ["REDIS_CLIENT", "REDIS_SUBSCRIBER_CLIENT", "REDIS_PUB_SUB_TOKEN", RedisConfig],
})
export class RedisModule {}
