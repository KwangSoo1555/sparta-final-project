import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  HttpStatus,
} from "@nestjs/common";

import { JobsService } from "../../src/modules/jobs/jobs.service";
import { JobsController } from "../../src/modules/jobs/jobs.controller";

import { UsersEntity } from "../../src/entities/users.entity";

import { CreateJobDto } from "../../src/modules/jobs/dto/create-job.dto";
import { UpdateJobDto } from "../../src/modules/jobs/dto/update-job.dto";
import { UserRoles } from "../../src/common/customs/enums/enum-user-roles";
import { MESSAGES } from "../../src/common/constants/message.constant";

describe("JobsController", () => {
  let controller: JobsController;
  let service: JobsService;

  const mockJobsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    applyForJob: jest.fn(),
    getApplicants: jest.fn(),
    updateJobYn: jest.fn(),
    updateJobCancelYn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        {
          provide: JobsService,
          useValue: mockJobsService,
        },
      ],
    }).compile();

    controller = module.get<JobsController>(JobsController);
    service = module.get<JobsService>(JobsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createJob", () => {
    it("job 생성 성공", async () => {
      const createJobDto: CreateJobDto = {
        title: "New Job",
        content: "Job Description",
        price: 100000,
        category: "IT",
        city: "Seoul",
        district: "Yongsan",
        dong: "Hannam",
        photoUrl: "https://example.com/photo.jpg",
      };
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;
      const expectedJob = { id: 1, ...createJobDto };

      mockJobsService.create.mockResolvedValue(expectedJob);

      const result = await controller.create(createJobDto, { user: { id: 1 } });

      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        message: MESSAGES.JOBS.CREATE.CREATE_SUCCEED,
        createJob: expectedJob,
      });
      expect(mockJobsService.create).toHaveBeenCalledWith(createJobDto, user.id);
    });

    it("job 생성 실패 시 에러 발생", async () => {
      const createJobDto: CreateJobDto = {
        title: "New Job",
        content: "Job Description",
        price: 100000,
        category: "IT",
        city: "Seoul",
        district: "Yongsan",
        dong: "Hannam",
        photoUrl: "https://example.com/photo.jpg",
      };
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;

      mockJobsService.create.mockRejectedValue(new BadRequestException());

      await expect(controller.create(createJobDto, { user: { id: 1 } })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findAll", () => {
    it("job 목록 조회 성공", async () => {
      const expectedJobs = [
        { id: 1, title: "Software Engineer" },
        { id: 2, title: "Product Manager" },
      ];
      const expectedResult = {
        jobs: expectedJobs,
        message: "성공적으로 조회되었습니다.",
        statusCode: 201,
      };
      mockJobsService.findAll.mockResolvedValue(expectedJobs);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult); // 예상 결과를 수정함
      expect(mockJobsService.findAll).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("job 수정 성공", async () => {
      const jobId = 1;
      const updateJobDto: UpdateJobDto = { title: "Updated Title" };
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;
      const updatedJob = { id: jobId, title: "Updated Title" };

      mockJobsService.update.mockResolvedValue(updatedJob);

      const result = await controller.update(jobId, { user: { id: 1 } }, updateJobDto);

      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        message: MESSAGES.JOBS.UPDATE.UPDATE_SUCCEED,
        updateJob: updatedJob,
      });
      expect(mockJobsService.update).toHaveBeenCalledWith(user.id, jobId, updateJobDto);
    });

    it("job 수정 실패 시 에러 발생", async () => {
      const jobId = 1;
      const updateJobDto: UpdateJobDto = { title: "Updated Title" };
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;

      mockJobsService.update.mockRejectedValue(new ForbiddenException());

      await expect(controller.update(jobId, { user: { id: 1 } }, updateJobDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("updateJobYn", () => {
    it("job 매칭 여부 수정 성공", async () => {
      const jobId = 1;
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;
      const updatedJob = { id: jobId, matching: true };

      mockJobsService.updateJobYn.mockResolvedValue(updatedJob);

      const result = await controller.updateJobYn(jobId, { user: { id: 1 } });

      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        message: MESSAGES.JOBS.MATCHING.MATCHING_SUCCEED,
        updateJob: updatedJob,
      });
      expect(mockJobsService.updateJobYn).toHaveBeenCalledWith(user.id, jobId);
    });

    it("job 매칭 여부 수정 실패 시 에러 발생", async () => {
      const jobId = 1;
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;

      mockJobsService.updateJobYn.mockRejectedValue(new BadRequestException());

      await expect(controller.updateJobYn(jobId, { user: { id: 1 } })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("updateJobCancelYn", () => {
    it("job 취소 여부 수정 성공", async () => {
      const jobId = 1;
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;
      const updatedJob = { id: jobId, cancel: true };

      mockJobsService.updateJobCancelYn.mockResolvedValue(updatedJob);

      const result = await controller.updateJobCancelYn(jobId, { user: { id: 1 } });

      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        message: MESSAGES.JOBS.CANCEL.CANCEL_SUCCEED,
        updateJob: updatedJob,
      });
      expect(mockJobsService.updateJobCancelYn).toHaveBeenCalledWith(user.id, jobId);
    });

    it("job 취소 여부 수정 실패 시 에러 발생", async () => {
      const jobId = 1;
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;

      mockJobsService.updateJobCancelYn.mockRejectedValue(new BadRequestException());

      await expect(controller.updateJobCancelYn(jobId, { user: { id: 1 } })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("delete", () => {
    it("job 삭제 성공", async () => {
      const jobId = 1;
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;

      mockJobsService.remove.mockResolvedValue({ affected: 1 });

      const result = await controller.remove(jobId, { user: { id: 1 } });

      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        message: MESSAGES.JOBS.DELETE.DELETE_SUCCEED,
        deleteJob: { affected: 1 },
      });
      expect(mockJobsService.remove).toHaveBeenCalledWith(user.id, jobId);
    });

    it("job 삭제 실패 시 에러 발생", async () => {
      const jobId = 999;
      const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;

      mockJobsService.remove.mockRejectedValue(new NotFoundException());

      await expect(controller.remove(jobId, { user: { id: 1 } })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // describe("applyForJob", () => {
  //   it("job 신청 성공", async () => {
  //     const jobId = 1;
  //     const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;

  //     mockJobsService.applyForJob.mockResolvedValue({
  //       message: "Application submitted successfully",
  //     });

  //     const result = await controller.applyForJob(jobId, user);

  //     expect(result).toEqual({ message: "Application submitted successfully" });
  //     expect(mockJobsService.applyForJob).toHaveBeenCalledWith(jobId, user);
  //   });

  //   it("job 신청 실패 시 에러 발생", async () => {
  //     const jobId = 1;
  //     const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;

  //     await expect(controller.applyForJob(jobId, user)).rejects.toThrow(BadRequestException);
  //   });
  // });

  // describe("getApplicants", () => {
  //   it("job 신청자 목록 조회 성공", async () => {
  //     const jobId = 1;
  //     const user: UsersEntity = { id: 1, role: UserRoles.USER } as UsersEntity;
  //     const expectedApplicants = [
  //       { id: 2, name: "John Doe" },
  //       { id: 3, name: "Jane Smith" },
  //     ];

  //     mockJobsService.getApplicants.mockResolvedValue(expectedApplicants);

  //     const result = await controller.getApplicants(jobId, user);

  //     expect(result).toEqual(expectedApplicants);
  //     expect(mockJobsService.getApplicants).toHaveBeenCalledWith(jobId, user);
  //   });

  //   it("job 신청자 목록 조회 실패 시 에러 발생", async () => {
  //     const jobId = 1;
  //     const user: UsersEntity = { id: 2, role: UserRoles.USER } as UsersEntity;

  //     mockJobsService.getApplicants.mockRejectedValue(new ForbiddenException());

  //     await expect(controller.getApplicants(jobId, user)).rejects.toThrow(ForbiddenException);
  //   });
  // });
});
