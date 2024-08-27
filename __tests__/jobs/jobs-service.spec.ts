import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { JobsService } from "../../src/modules/jobs/jobs.service";

import { UsersEntity } from "../../src/entities/users.entity";
import { JobsEntity } from "../../src/entities/jobs.entity";
import { LocalCodesEntity } from "../../src/entities/local-codes.entity";

import { CreateJobDto } from "../../src/modules/jobs/dto/create-job.dto";
import { UpdateJobDto } from "../../src/modules/jobs/dto/update-job.dto";
import { UserRoles } from "../../src/common/customs/enums/enum-user-roles";
import { MESSAGES } from "../../src/common/constants/message.constant";

describe("JobsService", () => {
  let service: JobsService;
  let jobsRepository: Repository<JobsEntity>;
  let usersRepository: Repository<UsersEntity>;
  let localCodesRepository: Repository<LocalCodesEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: getRepositoryToken(JobsEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(UsersEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(LocalCodesEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    jobsRepository = module.get<Repository<JobsEntity>>(getRepositoryToken(JobsEntity));
    usersRepository = module.get<Repository<UsersEntity>>(getRepositoryToken(UsersEntity));
    localCodesRepository = module.get<Repository<LocalCodesEntity>>(
      getRepositoryToken(LocalCodesEntity),
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createJob", () => {
    it("job 생성 성공", async () => {
      const createJobDto = {
        title: "Software Engineer",
        content: "We are looking for a talented software engineer",
        price: 100000,
        photoUrl: "https://example.com/photo.jpg",
        category: "IT",
        city: "Seoul",
        district: "Yongsan",
        dong: "Hannam",
      } as CreateJobDto;

      jest.spyOn(usersRepository, "findOne").mockResolvedValue({
        id: 1,
        role: UserRoles.USER,
      } as unknown as UsersEntity);

      const user = { id: 1, role: UserRoles.USER } as UsersEntity;

      const savedJob = await service.create(createJobDto, user.id);

      expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { id: user.id } });
      expect(jobsRepository.create).toHaveBeenCalledWith({ ...createJobDto, employer: user });
      expect(jobsRepository.save).toHaveBeenCalledWith(savedJob);
    });

    it("job 생성 실패, 중복된 job, (400)", async () => {
      const createJobDto = {
        title: "Software Engineer",
        content: "We are looking for a talented software engineer",
        price: 100000,
        category: "IT",
        city: "Seoul",
        district: "Yongsan",
        dong: "Hannam",
        photoUrl: "https://example.com/photo.jpg",
      };
      const user = { id: 1, role: "USER" };

      jest.spyOn(jobsRepository, "create").mockImplementation(() => {
        throw new BadRequestException(MESSAGES.JOBS.CREATE.DUPLICATE);
      });

      await expect(service.create(createJobDto, user.id)).rejects.toThrow(BadRequestException);
    });

    it("job 생성 실패, 존재하지 않는 유저, (404)", async () => {
      const createJobDto: CreateJobDto = {
        title: "Software Engineer",
        content: "We are looking for a talented software engineer",
        price: 100000,
        category: "IT",
        city: "Seoul",
        district: "Yongsan",
        dong: "Hannam",
        photoUrl: "https://example.com/photo.jpg",
      };

      jest.spyOn(usersRepository, "findOne").mockResolvedValue(null);

      await expect(service.create(createJobDto, 999)).rejects.toThrow(NotFoundException);
    });

    it("job 생성 실패, 존재하지 않는 지역 코드, (404)", async () => {
      const createJobDto: CreateJobDto = {
        title: "Software Engineer",
        content: "We are looking for a talented software engineer",
        price: 100000,
        category: "IT",
        city: "Seoul",
        district: "Yongsan",
        dong: "Hannam",
        photoUrl: "https://example.com/photo.jpg",
      };

      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;

      jest.spyOn(usersRepository, "findOne").mockResolvedValue(user);
      jest.spyOn(localCodesRepository, "findOne").mockResolvedValue(null);

      await expect(service.create(createJobDto, user.id)).rejects.toThrow(NotFoundException);
    });

    // it()
  });

  describe("findAll", () => {
    it("job 전체 조회 성공", async () => {
      const jobs = [
        { id: 1, title: "Software Engineer" },
        { id: 2, title: "Product Manager" },
      ];
      jest.spyOn(jobsRepository, "find").mockResolvedValue(jobs as JobsEntity[]);

      const result = await service.findAll();

      expect(result).toEqual(jobs);
      expect(jobsRepository.find).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("job 단일 조회 성공", async () => {
      const jobId = 1;
      const job = { id: jobId, title: "Software Engineer", address: "Seoul, Yongsan, Hannam" };

      jest.spyOn(jobsRepository, "findOne").mockResolvedValue(job as unknown as JobsEntity);
      jest
        .spyOn(localCodesRepository, "findOne")
        .mockResolvedValue({ localCode: 123, address: job.address } as unknown as LocalCodesEntity);

      const result = await service.findOne(jobId);

      expect(result).toEqual(job);
      expect(jobsRepository.findOne).toHaveBeenCalledWith({ where: { id: jobId } });
    });

    it("job 단일 조회 실패", async () => {
      const jobId = 999;
      jest.spyOn(jobsRepository, "findOne").mockResolvedValue(null);

      await expect(service.findOne(jobId)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("job 수정 성공", async () => {
      const updateJobDto = { title: "Senior Software Engineer" };
      const jobsId = 1;
      const ownerId = 1;

      jest.spyOn(jobsRepository, "findOne").mockResolvedValue({
        id: 1,
        title: "Software Engineer",
        ownerId: 1,
      } as unknown as JobsEntity);

      await service.update(ownerId, jobsId, updateJobDto);

      expect(jobsRepository.findOne).toHaveBeenCalledWith({ where: { id: jobsId } });
      expect(jobsRepository.update).toHaveBeenCalledWith({ id: jobsId }, updateJobDto);
    });

    it("job 수정 실패, 존재하지 않는 job, (404)", async () => {
      const jobId = 999;
      const updateJobDto: UpdateJobDto = { title: "Senior Software Engineer" };
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;

      jest.spyOn(jobsRepository, "findOne").mockResolvedValue(null);

      await expect(service.update(user.id, jobId, updateJobDto)).rejects.toThrow(NotFoundException);
    });

    it("job 수정 실패, 권한 없음, (403)", async () => {
      const jobId = 1;
      const updateJobDto: UpdateJobDto = { title: "Senior Software Engineer" };
      const user: UsersEntity = { id: 2, role: UserRoles.USER } as UsersEntity;
      const existingJob = { id: jobId, title: "Software Engineer", ownerId: 1 };

      jest.spyOn(jobsRepository, "findOne").mockResolvedValue(existingJob as JobsEntity);

      await expect(service.update(user.id, jobId, updateJobDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("updateJobYn", () => {
    it("job 매칭 여부 수정 성공", async () => {
      const jobId = 1;
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;

      jest.spyOn(jobsRepository, "update").mockImplementation(async (criteria, job) => {
        if (
          typeof criteria === "object" &&
          "id" in criteria &&
          criteria.id === jobId &&
          job.matchedYn
        ) {
          throw new BadRequestException("Job is already matched");
        }
        return { affected: 1, raw: {}, generatedMaps: [] };
      });

      await expect(service.updateJobYn(user.id, jobId)).rejects.toThrow(BadRequestException);
    });

    it("job 매칭 여부 수정 실패, 존재하지 않는 job, (404)", async () => {
      const jobId = 999;
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;

      jest.spyOn(jobsRepository, "findOne").mockResolvedValue(null);

      await expect(service.updateJobYn(user.id, jobId)).rejects.toThrow(NotFoundException);
    });

    it("job 매칭 여부 수정 실패, 권한 없음, (403)", async () => {
      const jobId = 1;
      const user: UsersEntity = { id: 2, role: UserRoles.USER } as UsersEntity;
      const existingJob = {
        id: jobId,
        title: "Software Engineer",
        ownerId: 1,
        matchedYn: false,
      } as JobsEntity;

      jest.spyOn(jobsRepository, "findOne").mockResolvedValue(existingJob);

      await expect(service.updateJobYn(user.id, jobId)).rejects.toThrow(ForbiddenException);
    });

    it("job 매칭 여부 수정 실패, 이미 매칭된 job, (400)", async () => {
      const jobId = 1;
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;
      const existingJob = {
        id: jobId,
        title: "Software Engineer",
        ownerId: user.id,
        matchedYn: true,
      } as JobsEntity;

      jest.spyOn(jobsRepository, "findOne").mockResolvedValue(existingJob);
      jest.spyOn(jobsRepository, "update").mockImplementation(async (criteria, partialEntity) => {
        return {
          affected: 1,
          raw: {},
          generatedMaps: [],
        };
      });

      await expect(service.updateJobYn(user.id, jobId)).rejects.toThrow(BadRequestException);
    });
  });

  describe("updateJobCancelYn", () => {
    // it("job 취소 여부 수정 성공", async () => {
    //   const jobId = 1;
    //   const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;
    //   const existingJob = {
    //     id: jobId,
    //     title: "Software Engineer",
    //     ownerId: 1,
    //     expiredYn: false,
    //   } as JobsEntity;

    //   jest.spyOn(jobsRepository, "findOne").mockResolvedValue(existingJob);
    //   jest
    //     .spyOn(jobsRepository, "update")
    //     .mockResolvedValue({ affected: 1, generatedMaps: [], raw: {} });

    //   const result = await service.updateJobCancelYn(user.id, jobId);

    //   expect(result.affected).toBe(1);
    //   expect(jobsRepository.findOneBy).toHaveBeenCalledWith({ id: jobId });
    //   expect(jobsRepository.update).toHaveBeenCalledWith({ id: jobId }, { expiredYn: true });
    // });

    it("job 취소 여부 수정 실패, 존재하지 않는 job, (404)", async () => {
      const jobId = 999;
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;

      jest.spyOn(jobsRepository, "findOne").mockResolvedValue(null);

      await expect(service.updateJobCancelYn(user.id, jobId)).rejects.toThrow(NotFoundException);
    });

    it("job 취소 여부 수정 실패, 권한 없음, (403)", async () => {
      const jobId = 1;
      const user: UsersEntity = { id: 2, role: UserRoles.USER } as UsersEntity;
      const existingJob = {
        id: jobId,
        title: "Software Engineer",
        ownerId: 1,
        expiredYn: false,
      } as JobsEntity;

      jest.spyOn(jobsRepository, "findOne").mockResolvedValue(existingJob);

      await expect(service.updateJobCancelYn(user.id, jobId)).rejects.toThrow(ForbiddenException);
    });
  });

  // 엔티티에 cancelYn 컬럼 추가 후 테스트 코드 작성. 취소 여부가 칼럼으로 있어야 함
  //   it("job 취소 여부 수정 실패, 이미 취소된 job, (400)", async () => {
  //     const jobId = 1;
  //     const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;
  //     const existingJob = {
  //       id: jobId,
  //       title: "Software Engineer",
  //       ownerId: user.id,
  //       expiredYn: true,
  //       cancelYn: true,
  //     } as JobsEntity;

  //     jest.spyOn(jobsRepository, "findOne").mockResolvedValue(existingJob);
  //     jest
  //       .spyOn(jobsRepository, "update")
  //       .mockResolvedValue({ affected: 0, generatedMaps: [], raw: {} });

  //     await expect(service.updateJobCancelYn(user.id, jobId)).rejects.toThrow(BadRequestException);
  //   });
  // });

  describe("deleteJob", () => {
    it("job 삭제 성공", async () => {
      const jobId = 1;
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;
      const existingJob = { id: jobId, title: "Software Engineer", ownerId: 1 };

      jest.spyOn(jobsRepository, "findOne").mockResolvedValue(existingJob as JobsEntity);
      jest.spyOn(jobsRepository, "softRemove").mockResolvedValue(existingJob as JobsEntity);

      const result = await service.remove(user.id, jobId);

      expect(result).toEqual(existingJob);
      expect(jobsRepository.findOne).toHaveBeenCalledWith({ where: { id: jobId } });
      expect(jobsRepository.softRemove).toHaveBeenCalledWith({ id: jobId });
    });

    it("job 삭제 실패, 존재하지 않는 job, (404)", async () => {
      const jobId = 999;
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;

      jest.spyOn(jobsRepository, "findOne").mockResolvedValue(null);

      await expect(service.remove(user.id, jobId)).rejects.toThrow(NotFoundException);
    });

    it("job 삭제 실패, 권한 없음, (403)", async () => {
      const jobId = 1;
      const user: UsersEntity = { id: 2, role: UserRoles.USER } as UsersEntity;
      const existingJob = { id: jobId, title: "Software Engineer", ownerId: 1 };

      jest.spyOn(jobsRepository, "findOne").mockResolvedValue(existingJob as JobsEntity);

      await expect(service.remove(user.id, jobId)).rejects.toThrow(ForbiddenException);
    });
  });

  //   describe("apply", () => {
  //     it("job 지원 성공", async () => {
  //       const jobId = 1;
  //       const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;
  //       const job = { id: jobId, title: "Software Engineer", applicants: [] };

  //       jest.spyOn(jobsRepository, "findOne").mockResolvedValue(job as unknown as JobsEntity);
  //       jest
  //         .spyOn(jobsRepository, "save")
  //         .mockResolvedValue({ ...job, applicants: [user] } as unknown as JobsEntity);

  //       const result = await service.apply(jobId, user.id);

  //       expect(result).toEqual({ message: "Application submitted successfully" });
  //       expect(jobsRepository.findOne).toHaveBeenCalledWith({
  //         where: { id: jobId },
  //         relations: ["applicants"],
  //       });
  //       expect(jobsRepository.save).toHaveBeenCalledWith({ ...job, applicants: [user] });
  //     });

  //     it("job 지원 실패, 존재하지 않는 job, (404)", async () => {
  //       const jobId = 999;
  //       const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;

  //       jest.spyOn(jobsRepository, "findOne").mockResolvedValue(null);

  //       await expect(service.apply(jobId, user.id)).rejects.toThrow(NotFoundException);
  //     });

  //     it("job 지원 실패, 이미 신청한 상태, (400)", async () => {
  //       const jobId = 1;
  //       const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;
  //       const job = { id: jobId, title: "Software Engineer", applicants: [user] };

  //       jest.spyOn(jobsRepository, "findOne").mockResolvedValue(job as unknown as JobsEntity);

  //       await expect(service.apply(jobId, user.id)).rejects.toThrow(BadRequestException);
  //     });
  //   });

  describe("getLocalcodes", () => {
    it("지역 코드 조회 성공", async () => {
      const mockLocalCode = {
        localCode: 123456,
        city: "Seoul",
        district: "Gangnam",
        dong: "Yeoksam",
      };
      jest
        .spyOn(localCodesRepository, "findOne")
        .mockResolvedValue(mockLocalCode as LocalCodesEntity);

      const result = await service.getLocalcodes("Seoul", "Gangnam", "Yeoksam");

      expect(result).toBe(123456);
      expect(localCodesRepository.findOne).toHaveBeenCalledWith({
        where: { city: "Seoul", district: "Gangnam", dong: "Yeoksam" },
      });
    });

    it("지역 코드 조회 실패, 지역 코드 없음, (404)", async () => {
      jest.spyOn(localCodesRepository, "findOne").mockResolvedValue(null);

      await expect(service.getLocalcodes("Seoul", "Gangnam", "Yeoksam")).rejects.toThrow(
        MESSAGES.JOBS.LOCALCODES.NOT_FOUND,
      );
    });
  });

  describe("getAdressByLocalcodes", () => {
    it("지역 코드로 주소 조회 성공", async () => {
      const mockAddress = {
        localCode: 123456,
        city: "Seoul",
        district: "Gangnam",
        dong: "Yeoksam",
      };
      jest
        .spyOn(localCodesRepository, "findOne")
        .mockResolvedValue(mockAddress as LocalCodesEntity);

      const result = await service.getAdressByLocalcodes(123456);

      expect(result).toEqual(mockAddress);
      expect(localCodesRepository.findOne).toHaveBeenCalledWith({ where: { localCode: 123456 } });
    });

    it("지역 코드로 주소 조회 실패, 주소 없음, (404)", async () => {
      jest.spyOn(localCodesRepository, "findOne").mockResolvedValue(null);

      await expect(service.getAdressByLocalcodes(123456)).rejects.toThrow(
        MESSAGES.JOBS.LOCALCODES.NOT_FOUND_ADDRESS,
      );
    });
  });
});
