import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisConfig {
  private redisClient: Redis;

  constructor(private configService: ConfigService) {
    this.redisClient = new Redis({
      host: this.configService.get<string>("REDIS_HOST"),
      port: this.configService.get<number>("REDIS_PORT"),
      password: this.configService.get<string>("REDIS_PASSWORD"),
    });
    this.initialize();
  }

  private async initialize() {
    try {
      await this.redisClient.ping();
      console.log("Redis connected successfully!");
    } catch (error) {
      console.error("Redis connection error : ", error);
    }
  }

  getClient(): Redis {
    return this.redisClient;
  }

  async setUserStatus(userId: number, status: string) {
    await this.redisClient.set(`user:${userId.toString()}:status`, status);
  }

  async getUserStatus(userId: number): Promise<string> {
    return this.redisClient.get(`user:${userId.toString()}:status`);
  }

  async removeUserStatus(userId: number) {
    await this.redisClient.del(`user:${userId.toString()}:status`);
  }

  //userId와 socketId를 redis 서버에 저장
  async setUserSocketId(userId: number, socketId: string) {
    await this.redisClient.set(`user:${userId.toString()}: socketId`, socketId);
  }

  //userId를 이용해 redis에서 socketId를 조회
  async getUserSocketId(userId: number): Promise<string | null> {
    return this.redisClient.get(`user:${userId.toString()}: socketId`);
  }

  async setNotice(cacheKey: string, data: any) {
    return this.redisClient.set(cacheKey, JSON.stringify(data), "EX", 1800);
  }

  async getNotice(cacheKey: string) {
    return this.redisClient.get(cacheKey);
  }
}
