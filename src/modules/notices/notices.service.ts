import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateNoticeDto } from "./dto/create-notice.dto";
import { UpdateNoticeDto } from "./dto/update-notice.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { NoticesEntity } from "src/entities/notices.entity";
import { Repository } from "typeorm";
import { MESSAGES } from "src/common/constants/message.constant";
import { RedisConfig } from "src/database/redis/redis.config";

@Injectable()
export class NoticesService {
  constructor(
    @InjectRepository(NoticesEntity)
    private readonly noticeRepository: Repository<NoticesEntity>,
    private readonly redisConfig: RedisConfig,

  ) {}

  // 공지사항 생성
  async createNewNotice(userId: number, noticeDetails: CreateNoticeDto): Promise<NoticesEntity> {
    const newNotice = this.noticeRepository.create({
      ...noticeDetails,
      userId,
    });

    return this.noticeRepository.save(newNotice);
  }

  // 공지사항 목록 조회
  async getNotices(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const cacheKey = `notices:${page}:${limit}`; // 캐시 키 생성

    // Redis에서 캐시된 데이터 조회
    const cachedData = await this.redisConfig.getNotice(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData); // 캐시된 데이터가 있으면 반환
    }

    // 데이터베이스에서 공지사항 조회
    const [notices, totalNotices] = await this.noticeRepository.findAndCount({
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const totalPages = Math.ceil(totalNotices / limit);

    const result = {
      data: notices,
      meta: {
        totalItems: totalNotices,
        currentPage: page,
        itemsPerPage: limit,
        totalPages,
      },
    };

    // 조회한 데이터를 Redis에 캐시
    await this.redisConfig.setNotice(cacheKey, result); // 5분 동안 캐시

    return result;
  }
  // 공지사항 상세 조회
  async getNoticeDetail(noticeId: number): Promise<NoticesEntity> {
    this.validateId(noticeId);
    return this.findOneBy(noticeId);
  }

  // 공지사항 업데이트
  async updateNotice(noticeId: number, updateNoticeDto: UpdateNoticeDto): Promise<NoticesEntity> {
    this.validateId(noticeId);
    await this.findOneBy(noticeId);

    await this.noticeRepository.update(noticeId, updateNoticeDto);
    return this.findOneBy(noticeId);
  }

  // 공지사항 삭제
  async removeNotice(noticeId: number) {
    this.validateId(noticeId);
    await this.findOneBy(noticeId);
    return this.noticeRepository.delete(noticeId);
  }

  // ID 유효성 검사 함수
  private validateId(id: number) {
    if (Number.isNaN(id) || id <= 0) {
      throw new NotFoundException(MESSAGES.NOTICES.ERROR.INVALID_ID);
    }
  }

  // 공지사항 ID 조회
  private async findOneBy(noticeId: number): Promise<NoticesEntity> {
    const noticeDetail = await this.noticeRepository.findOneBy({ id: noticeId });
    if (!noticeDetail) {
      throw new NotFoundException(MESSAGES.NOTICES.ERROR.NOT_FOUND);
    }
    return noticeDetail;
  }
}
