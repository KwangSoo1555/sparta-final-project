import _ from "lodash";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { MESSAGES } from "src/common/constants/message.constant";

import { JobsMatchingEntity } from "src/entities/jobs-matching.entity";
import { JobsEntity } from "src/entities/jobs.entity";
import { UsersEntity } from "src/entities/users.entity";
import { NotificationsService } from "src/modules/notifications/notifications.service";
import { NotificationTypes } from "src/common/customs/enums/enum-notifications";
import { CreateNotificationDto } from "src/modules/notifications/notifications.dto/create-notificaion.dto";
import Redis from "ioredis";

@Injectable()
export class JobMatchingService {
  constructor(
    @InjectRepository(JobsMatchingEntity)
    private jobsMatchingRepository: Repository<JobsMatchingEntity>,
    @InjectRepository(JobsEntity) private jobsRepository: Repository<JobsEntity>,
    @InjectRepository(UsersEntity) private userRepository: Repository<UsersEntity>,

    @Inject("REDIS_CLIENT")
    private readonly redisClient: Redis,
  ) {}

  async create(customerId: number, jobsId: number) {
    const verifyUserbyId = await this.userRepository.findOne({
      where: {
        id: customerId,
      },
    });
    if (verifyUserbyId === undefined || verifyUserbyId === null) {
      throw new NotFoundException(MESSAGES.USERS.COMMON.NOT_FOUND);
    }

    const verifyJobbyId = await this.jobsRepository.findOne({
      where: {
        id: jobsId,
        deletedAt: null,
      },
    });
    if (verifyJobbyId === undefined || verifyJobbyId === null) {
      throw new NotFoundException(MESSAGES.JOBS.NOT_EXISTS);
    }

    const data = await this.jobsMatchingRepository.save({
      customerId,
      jobId: jobsId,
      matchedYn: false,
      rejectedYn: false,
    });

    //지원자 발생 시 알림 발송 메서드
    await this.redisClient.publish(
      "jobMatcing",
      JSON.stringify({
        type: NotificationTypes.JOB_APPLIED,
        jobsId,
        customerId,
        ownerId: verifyJobbyId.ownerId,
      }),
    );
    console.log("jobMatchingCreated");

    return data;
  }

  async findAllApply(userId: number) {
    const data = await this.jobsMatchingRepository.find({
      relations: ["users", "job"],
      select: {
        id: true,
        customerId: true,
        jobId: true,
        matchedYn: true,
        rejectedYn: true,
        createdAt: true,
        users: {
          name: true,
        },
        job: {
          ownerId: true,
          title: true,
          content: true,
          price: true,
          photoUrl: true,
          address: true,
          category: true,
          expiredYn: true,
          matchedYn: true,
        },
      },
      where: {
        customerId: userId,
        deletedAt: null,
      },
      order: { createdAt: "DESC" },
    });

    return data;
  }

  async findAllApplication(userId: number) {
    const data = await this.jobsMatchingRepository.find({
      relations: ["users", "job"],
      select: {
        id: true,
        customerId: true,
        jobId: true,
        matchedYn: true,
        rejectedYn: true,
        createdAt: true,
        users: {
          name: true,
        },
        job: {
          ownerId: true,
          title: true,
          content: true,
          price: true,
          photoUrl: true,
          address: true,
          category: true,
          expiredYn: true,
          matchedYn: true,
        },
      },
      where: {
        job: {
          ownerId: userId,
          deletedAt: null,
        },
      },
      order: { createdAt: "DESC" },
    });

    return data;
  }

  async findOne(matchingId: number) {
    const data = await this.jobsMatchingRepository.findOne({
      where: {
        id: matchingId,
      },
    });

    return data;
  }

  async updateMatchYn(userId: number, matchingId: number) {
    const matching = await this.jobsMatchingRepository.findOne({
      where: { id: matchingId },
      relations: ["job"],
    });
    if (matching === undefined || matching === null) {
      throw new NotFoundException(MESSAGES.JOBMATCH.NOT_EXISTS);
    }
    if (matching.job.ownerId !== userId) {
      throw new BadRequestException(MESSAGES.JOBMATCH.MATCHING.NOT_VERIFY);
    }

    //매칭 수락 시 알림 발송 메서드
    await this.redisClient.publish(
      "jobMatcing",
      JSON.stringify({
        type: NotificationTypes.JOB_APPLIED,
        jobId: matching.jobId,
        customerId: matching.customerId,
        ownerId: matching.job.ownerId,
      }),
    );

    return await this.jobsMatchingRepository.update(
      { id: matchingId },
      {
        matchedYn: true,
      },
    );
  }

  async updateRejectYn(userId: number, matchingId: number) {
    const matching = await this.jobsMatchingRepository.findOne({
      where: { id: matchingId },
      relations: ["job"],
    });
    if (matching === undefined || matching === null) {
      throw new NotFoundException(MESSAGES.JOBMATCH.NOT_EXISTS);
    }
    if (matching.job.ownerId !== userId) {
      throw new BadRequestException(MESSAGES.JOBMATCH.REJECT.NOT_VERIFY);
    }

    //매칭 거절 시 알림 발송 메서드
    await this.redisClient.publish(
      "jobMatcing",
      JSON.stringify({
        type: NotificationTypes.JOB_DENIED,
        jobId: matching.jobId,
        customerId: matching.customerId,
        ownerId: matching.job.ownerId,
      }),
    );

    return await this.jobsMatchingRepository.update(
      { id: matchingId },
      {
        rejectedYn: true,
      },
    );
  }

  async remove(userId: number, matchingId: number) {
    const matching = await this.jobsMatchingRepository.findOneBy({ id: matchingId });
    if (matching === undefined || matching === null) {
      throw new NotFoundException(MESSAGES.JOBMATCH.NOT_EXISTS);
    }
    if (matching.customerId !== userId) {
      throw new BadRequestException(MESSAGES.JOBMATCH.DELETE.NOT_VERIFY);
    }

    return await this.jobsMatchingRepository.softRemove({ id: matchingId });
  }
}
