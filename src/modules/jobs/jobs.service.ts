import _ from "lodash";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { MESSAGES } from "src/common/constants/message.constant";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { JobsEntity } from "src/entities/jobs.entity";
import { UsersEntity } from "src/entities/users.entity";
import { LocalCodesEntity } from "src/entities/local-codes.entity";
import { RedisConfig } from "src/database/redis/redis.config";
@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobsEntity) private jobsRepository: Repository<JobsEntity>,
    @InjectRepository(UsersEntity) private UserRepository: Repository<UsersEntity>,
    @InjectRepository(LocalCodesEntity) private localcodesRepository: Repository<LocalCodesEntity>,
    private readonly redisConfig: RedisConfig,
  ) {}
  async create(createJobDto: CreateJobDto, userId: number) {
    const { title, content, photoUrl, price, city, district, dong, category } = createJobDto;
  
    // 사용자 검증
    const verifyUserbyId = await this.UserRepository.findOne({
      where: {
        id: userId,
      },
    });
    if (!verifyUserbyId) {
      throw new NotFoundException(MESSAGES.USERS.COMMON.NOT_FOUND);
    }
  
    // 지역 코드 가져오기
    const localCode = await this.getLocalcodes(city, district, dong);
  
    // 잡일 데이터 저장
    const jobData = {
      ownerId: userId,
      title,
      content,
      photoUrl: photoUrl || null, // photoUrl이 없으면 null로 설정
      price,
      address: localCode,
      category,
      expiredYn: false,
      matchedYn: false,
    };
  
    const data = await this.jobsRepository.save(jobData);
  
    // 캐시 무효화
    await this.redisConfig.removeNotice('jobs:all'); // 캐시 무효화
  
    return data;
  }
  
  async findAll() {
    const cacheKey = 'jobs:all'; // 캐시 키 생성
  
    // Redis에서 캐시된 데이터 조회
    const cachedData = await this.redisConfig.getJob(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData); // 캐시된 데이터가 있으면 반환
    }
  
    // 데이터베이스에서 작업 조회
    const data = await this.jobsRepository.find({
      where: {
        expiredYn: false,
        matchedYn: false,
      },
      order: { createdAt: "DESC" },
    });
  
    // 조회한 데이터를 Redis에 캐시
    await this.redisConfig.setJob(cacheKey, data); // 5분 동안 캐시
  
    return data;
  }
  
  async findOne(jobsId: number) {
    const data = await this.jobsRepository.findOne({
      where: {
        id: jobsId,
      },
    });
    // address 필드로 주소 데이터를 가져옵니다.
    const jobAddress = await this.getAdressByLocalcodes(data.address);
    // data 객체에서 address 필드를 제외한 나머지를 가져옵니다.
    const { address, ...dataWithoutAddress } = data;
    // address 객체에서 localCode 필드를 제외한 나머지를 가져옵니다.
    const { localCode, ...addressWithoutLocalCode } = jobAddress;
    // 두 객체를 합칩니다.
    const result = {
      ...dataWithoutAddress,
      ...addressWithoutLocalCode,
    };
    // 결과를 반환합니다.
    return result;
  }
  async update(ownerId: number, jobsId: number, updateJobDto: UpdateJobDto) {
    const jobs = await this.jobsRepository.findOneBy({ id: jobsId });
    if (jobs === undefined || jobs === null) {
      throw new NotFoundException(MESSAGES.JOBS.NOT_EXISTS);
    }
    if (jobs.ownerId !== ownerId) {
      throw new BadRequestException(MESSAGES.JOBS.UPDATE.NOT_VERIFY);
    }
    return await this.jobsRepository.update({ id: jobsId }, updateJobDto);
  }
  async updateJobYn(ownerId: number, jobsId: number) {
    const jobs = await this.jobsRepository.findOneBy({ id: jobsId });
    if (jobs === undefined || jobs === null) {
      throw new NotFoundException(MESSAGES.JOBS.NOT_EXISTS);
    }
    if (jobs.ownerId !== ownerId) {
      throw new BadRequestException(MESSAGES.JOBS.MATCHING.NOT_VERIFY);
    }
    return await this.jobsRepository.update(
      { id: jobsId },
      {
        matchedYn: true,
      },
    );
  }
  async updateJobCancelYn(ownerId: number, jobsId: number) {
    const jobs = await this.jobsRepository.findOneBy({ id: jobsId });
    if (jobs === undefined || jobs === null) {
      throw new NotFoundException(MESSAGES.JOBS.NOT_EXISTS);
    }
    if (jobs.ownerId !== ownerId) {
      throw new BadRequestException(MESSAGES.JOBS.CANCEL.NOT_VERIFY);
    }
    return await this.jobsRepository.update(
      { id: jobsId },
      {
        expiredYn: true,
      },
    );
  }
  async remove(ownerId: number, jobsId: number) {
    const jobs = await this.jobsRepository.findOneBy({ id: jobsId });
    if (jobs === undefined || jobs === null) {
      throw new NotFoundException(MESSAGES.JOBS.NOT_EXISTS);
    }
    if (jobs.ownerId !== ownerId) {
      throw new BadRequestException(MESSAGES.JOBS.DELETE.NOT_VERIFY);
    }
    return await this.jobsRepository.softRemove({ id: jobsId });
  }
  async getLocalcodes(city: string, district: string, dong: string): Promise<number> {
    const localCodes = await this.localcodesRepository.findOne({
      where: { city: city, district: district, dong: dong },
    });
    if (!localCodes) {
      throw new Error("Local code not found");
    }
    return localCodes.localCode;
  }
  async getAdressByLocalcodes(localCode: number) {
    const address = await this.localcodesRepository.findOne({ where: { localCode: localCode } });
    if (!address) {
      throw new Error("address not found");
    }
    return address;
  }
  async getJobByLocalcodes(city: string, district: string, dong: string) {
    const localCode = await this.getLocalcodes(city, district, dong);
    const jobs = await this.jobsRepository.find({
      where: { address: +localCode },
      order: { createdAt: "DESC" },
    });
    return jobs;
  }
}
