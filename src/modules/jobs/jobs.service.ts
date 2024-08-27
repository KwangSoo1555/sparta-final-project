import _ from "lodash";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { UsersEntity } from "src/entities/users.entity";
import { JobsEntity } from "src/entities/jobs.entity";
import { LocalCodesEntity } from "src/entities/local-codes.entity";

import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { MESSAGES } from "src/common/constants/message.constant";

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobsEntity) private jobsRepository: Repository<JobsEntity>,
    @InjectRepository(UsersEntity) private UserRepository: Repository<UsersEntity>,
    @InjectRepository(LocalCodesEntity) private localcodesRepository: Repository<LocalCodesEntity>,
  ) {}
  async create(createJobDto: CreateJobDto, userId: number) {
    const { title, content, photoUrl, price, city, district, dong, category } = createJobDto;
    const verifyUserbyId = await this.UserRepository.findOne({
      where: {
        id: userId,
      },
    });
    if (verifyUserbyId === undefined || verifyUserbyId === null) {
      throw new NotFoundException(MESSAGES.USERS.COMMON.NOT_FOUND);
    }
    const localCode = await this.getLocalcodes(city, district, dong);
    if (photoUrl != "") {
      const data = await this.jobsRepository.save({
        ownerId: userId,
        title,
        content,
        photoUrl,
        price,
        address: localCode,
        category,
        expiredYn: false,
        matchedYn: false,
      });
      return data;
    } else {
      const data = await this.jobsRepository.save({
        ownerId: userId,
        title,
        content,
        price,
        address: localCode,
        category,
        expiredYn: false,
        matchedYn: false,
      });
      return data;
    }
  }

  async findAll() {
    const data = await this.jobsRepository.find({
      where: {
        expiredYn: false,
        matchedYn: false,
      },
      order: { createdAt: "DESC" },
    });
    return data;
  }

  async findOne(jobsId: number) {
    const data = await this.jobsRepository.findOne({
      where: { id: jobsId },
    });

    // data가 null인 경우 404 에러를 발생
    if (!data) {
      throw new NotFoundException(MESSAGES.JOBS.NOT_EXISTS);
    }

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
    const jobs = await this.jobsRepository.findOne({ where: { id: jobsId } });
    if (jobs === undefined || jobs === null) {
      throw new NotFoundException(MESSAGES.JOBS.NOT_EXISTS);
    }
    if (jobs.ownerId !== ownerId) {
      throw new ForbiddenException(MESSAGES.JOBS.UPDATE.NOT_VERIFY);
    }
    return await this.jobsRepository.update({ id: jobsId }, updateJobDto);
  }

  async updateJobYn(ownerId: number, jobsId: number) {
    const jobs = await this.jobsRepository.findOne({ where: { id: jobsId } });
    if (jobs === undefined || jobs === null) {
      throw new NotFoundException(MESSAGES.JOBS.NOT_EXISTS);
    }
    if (jobs.ownerId !== ownerId) {
      throw new ForbiddenException(MESSAGES.JOBS.MATCHING.NOT_VERIFY);
    }
    return await this.jobsRepository.update(
      { id: jobsId },
      {
        matchedYn: true,
      },
    );
  }

  async updateJobCancelYn(ownerId: number, jobsId: number) {
    const jobs = await this.jobsRepository.findOne({ where: { id: jobsId } });
    if (jobs === undefined || jobs === null) {
      throw new NotFoundException(MESSAGES.JOBS.NOT_EXISTS);
    }
    if (jobs.ownerId !== ownerId) {
      throw new ForbiddenException(MESSAGES.JOBS.CANCEL.NOT_VERIFY);
    }
    return await this.jobsRepository.update(
      { id: jobsId },
      {
        expiredYn: true,
      },
    );
  }

  async remove(ownerId: number, jobsId: number) {
    const jobs = await this.jobsRepository.findOne({ where: { id: jobsId } });
    if (jobs === undefined || jobs === null) {
      throw new NotFoundException(MESSAGES.JOBS.NOT_EXISTS);
    }
    if (jobs.ownerId !== ownerId) {
      throw new ForbiddenException(MESSAGES.JOBS.DELETE.NOT_VERIFY);
    }
    return await this.jobsRepository.softRemove({ id: jobsId });
  }

  async getLocalcodes(city: string, district: string, dong: string): Promise<number> {
    const localCodes = await this.localcodesRepository.findOne({
      where: { city: city, district: district, dong: dong },
    });
    if (!localCodes) {
      throw new NotFoundException(MESSAGES.JOBS.LOCALCODES.NOT_FOUND);
    }
    return localCodes.localCode;
  }

  async getAdressByLocalcodes(localCode: number) {
    const address = await this.localcodesRepository.findOne({ where: { localCode: localCode } });
    if (!address) {
      throw new NotFoundException(MESSAGES.JOBS.LOCALCODES.NOT_FOUND_ADDRESS);
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
