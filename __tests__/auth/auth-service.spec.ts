import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import * as nodemailer from "nodemailer";
import * as nodemailerMock from "nodemailer-mock";
import { Redis } from "ioredis";

import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpStatus,
} from "@nestjs/common";

import { ConfigService } from "@nestjs/config";
import { AuthService } from "../../src/modules/auth/auth.service";

import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { RefreshTokensEntity } from "../../src/entities/refresh-tokens.entity";
import { UsersEntity } from "../../src/entities/users.entity";

import { JwtPayload } from "../../src/common/customs/types/jwt-payload.type";
import { AUTH_CONSTANT } from "../../src/common/constants/auth.constant";
import { MESSAGES } from "../../src/common/constants/message.constant";

jest.mock("bcrypt");
jest.mock("jsonwebtoken");
jest.mock("nodemailer");

describe("AuthService", () => {
  let service: AuthService;
  let configService: ConfigService;
  let userRepository: Repository<UsersEntity>;
  let refreshTokenRepository: Repository<RefreshTokensEntity>;
  let redisClient: Redis;
  let smtpTransport;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UsersEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefreshTokensEntity),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            upsert: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: "REDIS_CLIENT",
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            hmset: jest.fn(),
            hmget: jest.fn(),
            expire: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "MAIL_AUTH_USER") return "test@example.com";
              if (key === "MAIL_AUTH_PASS") return "password";
              if (key === "ACCESS_TOKEN_SECRET") return "mocked-value";
              if (key === "REFRESH_TOKEN_SECRET") return "mocked-value";
              return null;
            }),
          },
        },
        {
          provide: "SMTP_TRANSPORT",
          useValue: nodemailerMock.createTransport({}),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
    userRepository = module.get<Repository<UsersEntity>>(getRepositoryToken(UsersEntity));
    refreshTokenRepository = module.get<Repository<RefreshTokensEntity>>(
      getRepositoryToken(RefreshTokensEntity),
    );
    redisClient = module.get<Redis>("REDIS_CLIENT");
    smtpTransport = module.get<nodemailer.Transporter>("SMTP_TRANSPORT");
    nodemailerMock.mock.reset();
    (nodemailer.createTransport as jest.Mock).mockReturnValue(nodemailerMock.createTransport({}));
  });

  afterEach(() => {
    jest.clearAllMocks();
    nodemailerMock.mock.reset();
  });

  describe("sendAuthEmail", () => {
    it("이메일 전송 실패 시 에러 발생", async () => {
      const emailVerificationDto = { email: "test@example.com" };
      jest.spyOn(redisClient, "set").mockResolvedValue("OK");
      nodemailerMock.mock.setShouldFailOnce();

      await expect(service.sendAuthEmail(emailVerificationDto)).rejects.toThrow(
        MESSAGES.AUTH.SIGN_UP.EMAIL.FAIL,
      );

      expect(nodemailerMock.mock.getSentMail().length).toBe(0);
    });

    it("인증 이메일 발송 성공", async () => {
      const emailVerificationDto = { email: "test@example.com" };
      jest.spyOn(redisClient, "set").mockResolvedValue("OK");
      jest.spyOn(service as any, "codeNumber").mockReturnValue(123456);

      const result = await service.sendAuthEmail(emailVerificationDto);

      expect(result.status).toBe(HttpStatus.OK);
      expect(result.message).toBe(MESSAGES.AUTH.SIGN_UP.EMAIL.SUCCEED);
      expect(result.data).toHaveProperty("code");
      expect(result.data).toHaveProperty("timestamp");

      const sentMail = nodemailerMock.mock.getSentMail();
      expect(sentMail.length).toBe(1);
      expect(sentMail[0].to).toBe(emailVerificationDto.email);
      expect(sentMail[0].subject).toBe(AUTH_CONSTANT.AUTH_EMAIL.SUBJECT);
      expect(sentMail[0].html).toContain("123456");
    });
  });

  describe("getVerificationCode", () => {
    it("Redis에서 인증 코드 반환", async () => {
      jest.spyOn(redisClient, "get").mockResolvedValue("123456");

      const result = await service.getVerificationCode("test@example.com");

      expect(result).toBe(123456);
    });

    it("인증 코드가 없으면 null 반환", async () => {
      jest.spyOn(redisClient, "get").mockResolvedValue(null);

      const result = await service.getVerificationCode("test@example.com");

      expect(result).toBeNull();
    });
  });

  describe("sendTempPassword", () => {
    it("임시 비밀번호 전송 성공", async () => {
      const emailVerificationDto = { email: "test@example.com" };
      jest.spyOn(redisClient, "set").mockResolvedValue("OK");
      jest.spyOn(service["smtpTransport"], "sendMail").mockResolvedValue({} as any);

      const result = await service.sendTempPassword(emailVerificationDto);

      expect(result.status).toBe(200);
      expect(result.message).toBe(MESSAGES.AUTH.SIGN_UP.EMAIL.SUCCEED);
      expect(result.data).toHaveProperty("tempPassword");
    });

    it("임시 비밀번호 전송 실패 시 에러 발생", async () => {
      const emailVerificationDto = { email: "test@example.com" };
      jest.spyOn(redisClient, "set").mockResolvedValue("OK");
      jest
        .spyOn(service["smtpTransport"], "sendMail")
        .mockRejectedValue(new Error("Email sending failed"));

      await expect(service.sendTempPassword(emailVerificationDto)).rejects.toThrow(
        "Email sending failed",
      );
    });
  });

  describe("getTempPassword", () => {
    it("Redis에서 임시 비밀번호 반환", async () => {
      jest.spyOn(redisClient, "get").mockResolvedValue("tempPass123");

      const result = await service.getTempPassword("test@example.com");

      expect(result).toBe("tempPass123");
    });

    it("임시 비밀번호가 없으면 null 반환", async () => {
      jest.spyOn(redisClient, "get").mockResolvedValue(null);

      const result = await service.getTempPassword("test@example.com");

      expect(result).toBeNull();
    });
  });

  describe("checkUserForAuth", () => {
    it("존재하는 유저 반환", async () => {
      const mockUser = { id: 1, email: "test@example.com" };
      jest.spyOn(userRepository, "findOne").mockResolvedValue(mockUser as UsersEntity);

      const result = await service.checkUserForAuth({ email: "test@example.com" });

      expect(result).toEqual(mockUser);
    });

    it("존재하지 않는 유저 반환", async () => {
      jest.spyOn(userRepository, "findOne").mockResolvedValue(null);

      const result = await service.checkUserForAuth({ email: "test@example.com" });

      expect(result).toBeNull();
    });
  });

  describe("signUp", () => {
    const signUpDto = {
      email: "test@example.com",
      name: "Test User",
      password: "password123",
      verificationCode: 123456,
    };

    it("이미 존재하는 유저 시 오류 발생", async () => {
      jest
        .spyOn(service, "checkUserForAuth")
        .mockResolvedValue({ id: 1, deletedAt: null } as UsersEntity);

      await expect(service.signUp(signUpDto)).rejects.toThrow(ConflictException);
    });

    it("인증 코드가 일치하지 않으면 오류 발생", async () => {
      jest.spyOn(service, "checkUserForAuth").mockResolvedValue(null);
      jest.spyOn(service, "getVerificationCode").mockResolvedValue(654321);

      await expect(service.signUp(signUpDto)).rejects.toThrow(BadRequestException);
    });

    it("soft deleted 유저 복구", async () => {
      jest.spyOn(service, "checkUserForAuth").mockResolvedValue(null);
      jest.spyOn(service, "getVerificationCode").mockResolvedValue(123456);
      jest.spyOn(bcrypt, "hash").mockResolvedValue("hashedPassword" as never);
      jest
        .spyOn(userRepository, "findOne")
        .mockResolvedValue({ id: 1, deletedAt: new Date() } as UsersEntity);
      jest.spyOn(userRepository, "save").mockResolvedValue({
        id: 1,
        ...signUpDto,
        password: undefined,
        deletedAt: null,
      } as unknown as UsersEntity);
      jest.spyOn(redisClient, "del").mockResolvedValue(1);

      const result = await service.signUp(signUpDto);

      expect(result).toEqual({
        id: 1,
        email: signUpDto.email,
        name: signUpDto.name,
        deletedAt: null,
      });
      expect("password" in result).toBeFalsy();
    });

    it("모든 것이 유효하면 새 유저 생성", async () => {
      jest.spyOn(service, "checkUserForAuth").mockResolvedValue(null);
      jest.spyOn(service, "getVerificationCode").mockResolvedValue(123456);
      jest.spyOn(bcrypt, "hash").mockResolvedValue("hashedPassword" as never);
      jest.spyOn(userRepository, "findOne").mockResolvedValue(null);
      jest.spyOn(userRepository, "create").mockReturnValue({
        id: 1,
        ...signUpDto,
        password: "hashedPassword",
        deletedAt: null,
      } as unknown as UsersEntity);

      jest
        .spyOn(userRepository, "save")
        .mockResolvedValue({ id: 1, ...signUpDto, password: undefined } as unknown as UsersEntity);
      jest.spyOn(redisClient, "del").mockResolvedValue(1);

      const result = await service.signUp(signUpDto);

      expect(result).toEqual({ id: 1, email: signUpDto.email, name: signUpDto.name });
      expect("password" in result).toBeFalsy();
    });
  });

  describe("signIn", () => {
    const signInDto = { email: "test@example.com", password: "password123" };

    it("존재하지 않는 유저 시 오류 발생", async () => {
      jest.spyOn(service, "checkUserForAuth").mockResolvedValue(null);

      await expect(service.signIn(signInDto, "127.0.0.1", "test-agent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("비밀번호가 일치하지 않으면 오류 발생", async () => {
      jest
        .spyOn(service, "checkUserForAuth")
        .mockResolvedValue({ id: 1, password: "hashedPassword" } as UsersEntity);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(false as never);

      await expect(service.signIn(signInDto, "127.0.0.1", "test-agent")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("자격 증명이 유효하면 토큰 및 역할 반환", async () => {
      jest
        .spyOn(service, "checkUserForAuth")
        .mockResolvedValue({ id: 1, password: "hashedPassword" } as UsersEntity);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);
      jest
        .spyOn(service, "createToken")
        .mockReturnValueOnce("accessToken")
        .mockReturnValueOnce("refreshToken");
      jest.spyOn(service, "refreshTokenStore").mockResolvedValue(undefined);

      const result = await service.signIn(signInDto, "127.0.0.1", "test-agent");

      expect(result).toEqual({
        accessToken: "accessToken",
        refreshToken: "refreshToken",
        role: "user",
      });
    });
  });

  describe("socialSignIn", () => {
    const mockUser = { id: 1, email: "test@example.com", role: "user" };
    const mockResponse = { redirect: jest.fn() };

    it("soft deleted 유저 복구", async () => {
      jest
        .spyOn(userRepository, "findOne")
        .mockResolvedValue({ ...mockUser, deletedAt: new Date() } as UsersEntity);
      jest
        .spyOn(userRepository, "save")
        .mockResolvedValue({ ...mockUser, deletedAt: null } as UsersEntity);
      jest.spyOn(service, "createToken").mockReturnValue("token");
      jest.spyOn(service, "refreshTokenStore").mockResolvedValue(undefined);
      jest.spyOn(redisClient, "hmset").mockResolvedValue("OK");
      jest.spyOn(redisClient, "expire").mockResolvedValue(1);

      await service.socialSignIn(
        mockUser,
        "127.0.0.1",
        "test-agent",
        "authCode",
        mockResponse as any,
      );

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: null }),
      );
      expect(mockResponse.redirect).toHaveBeenCalled();
    });

    it("존재하지 않는 유저 시 새 유저 생성", async () => {
      jest.spyOn(userRepository, "findOne").mockResolvedValue(null);
      jest.spyOn(service, "checkUserForAuth").mockResolvedValue(null);
      jest.spyOn(userRepository, "save").mockResolvedValue(mockUser as UsersEntity);
      jest.spyOn(service, "createToken").mockReturnValue("token");
      jest.spyOn(service, "refreshTokenStore").mockResolvedValue(undefined);
      jest.spyOn(redisClient, "hmset").mockResolvedValue("OK");
      jest.spyOn(redisClient, "expire").mockResolvedValue(1);

      await service.socialSignIn(
        mockUser,
        "127.0.0.1",
        "test-agent",
        "authCode",
        mockResponse as any,
      );

      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(mockResponse.redirect).toHaveBeenCalled();
    });

    it("에러 발생 시 오류 발생", async () => {
      jest.spyOn(userRepository, "findOne").mockRejectedValue(new Error("Database error"));

      await expect(
        service.socialSignIn(mockUser, "127.0.0.1", "test-agent", "authCode", mockResponse as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("getAuthCode", () => {
    it("Redis에서 인증 데이터 반환", async () => {
      jest.spyOn(redisClient, "hmget").mockResolvedValue(["accessToken", "refreshToken", "user"]);

      const result = await service.getAuthCode("authCode");

      expect(result).toEqual(["accessToken", "refreshToken", "user"]);
    });
  });

  describe("tokenReissue", () => {
    it("refresh token이 없으면 오류 발생", async () => {
      jest.spyOn(refreshTokenRepository, "findOne").mockResolvedValue(null);

      await expect(
        service.tokenReissue(1, "refreshToken", "127.0.0.1", "test-agent"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("refresh token이 일치하지 않으면 오류 발생", async () => {
      jest
        .spyOn(refreshTokenRepository, "findOne")
        .mockResolvedValue({ refreshToken: "hashedToken" } as RefreshTokensEntity);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(false as never);

      await expect(
        service.tokenReissue(1, "refreshToken", "127.0.0.1", "test-agent"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("refresh token이 유효하면 새 토큰 반환", async () => {
      jest
        .spyOn(refreshTokenRepository, "findOne")
        .mockResolvedValue({ refreshToken: "hashedToken" } as RefreshTokensEntity);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);
      jest
        .spyOn(service, "createToken")
        .mockReturnValueOnce("newAccessToken")
        .mockReturnValueOnce("newRefreshToken");
      jest.spyOn(service, "refreshTokenStore").mockResolvedValue(undefined);

      const result = await service.tokenReissue(1, "refreshToken", "127.0.0.1", "test-agent");

      expect(result).toEqual({
        accessToken: "newAccessToken",
        refreshToken: "newRefreshToken",
      });
    });
  });

  describe("findPw", () => {
    const findPwDto = { email: "test@example.com", name: "Test User", tempPassword: "temp123" };

    it("존재하지 않는 유저 시 오류 발생", async () => {
      jest.spyOn(userRepository, "findOne").mockResolvedValue(null);

      await expect(service.findPw(findPwDto)).rejects.toThrow(NotFoundException);
    });

    it("임시 비밀번호가 일치하지 않으면 오류 발생", async () => {
      jest.spyOn(userRepository, "findOne").mockResolvedValue({ id: 1 } as UsersEntity);
      jest.spyOn(service, "getTempPassword").mockResolvedValue("wrongTemp");

      await expect(service.findPw(findPwDto)).rejects.toThrow(NotFoundException);
    });

    it("임시 비밀번호 변경 및 성공 메시지 반환", async () => {
      jest.spyOn(userRepository, "findOne").mockResolvedValue({ id: 1 } as UsersEntity);
      jest.spyOn(service, "getTempPassword").mockResolvedValue("temp123");
      jest.spyOn(bcrypt, "hash").mockResolvedValue("hashedPassword" as never);
      jest.spyOn(userRepository, "update").mockResolvedValue({} as any);
      jest.spyOn(redisClient, "del").mockResolvedValue(1);

      const result = await service.findPw(findPwDto);

      expect(result.status).toBe(200);
      expect(result.message).toBe("비밀번호가 임시 비밀번호로 변경되었습니다.");
      expect(result.data.password).toBe("temp123");
    });
  });

  describe("signOut", () => {
    it("refresh token을 null로 변경", async () => {
      jest.spyOn(refreshTokenRepository, "update").mockResolvedValue({} as any);

      const result = await service.signOut(1);

      expect(result.message).toBe(MESSAGES.AUTH.SIGN_OUT.SUCCEED);
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: 1 },
        { refreshToken: null },
      );
    });
  });

  describe("verifyToken", () => {
    it("access token 검증", () => {
      const mockPayload = { userId: 1, type: "ACCESS" };
      jest.spyOn(jwt, "verify").mockReturnValue(mockPayload as any);

      const result = service.verifyToken("access_token");

      expect(result).toEqual(mockPayload);
      expect(jwt.verify).toHaveBeenCalledWith("access_token", "mocked-value");
    });

    it("refresh token 검증", () => {
      const mockPayload = { userId: 1, type: "REFRESH" };
      jest.spyOn(jwt, "verify").mockReturnValue(mockPayload as any);

      const result = service.verifyToken("refresh_token");

      expect(result).toEqual(mockPayload);
      expect(jwt.verify).toHaveBeenCalledWith("refresh_token", "mocked-value");
    });

    it("토큰 검증 실패 시 오류 발생", () => {
      jest.spyOn(jwt, "verify").mockImplementation(() => {
        throw new Error("Invalid token");
      });

      expect(() => service.verifyToken("invalid_token")).toThrow(UnauthorizedException);
    });
  });

  describe("createToken", () => {
    it("access token 생성", () => {
      jest.spyOn(jwt, "sign").mockReturnValue("access_token" as any);

      const result = service.createToken({ userId: 1 });

      expect(result).toBe("access_token");
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 1, type: "ACCESS" },
        "mocked-value",
        expect.any(Object),
      );
    });

    it("refresh token 생성", () => {
      jest.spyOn(jwt, "sign").mockReturnValue("refresh_token" as any);

      const result = service.createToken({ userId: 1 }, true);

      expect(result).toBe("refresh_token");
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 1, type: "REFRESH" },
        "mocked-value",
        expect.any(Object),
      );
    });

    it("토큰 생성 실패 시 오류 발생", () => {
      jest.spyOn(jwt, "sign").mockImplementation(() => {
        throw new Error("Token creation failed");
      });

      expect(() => service.createToken({ userId: 1 })).toThrow(MESSAGES.AUTH.TOKEN.OCCURRED_ERROR);
    });
  });

  describe("refreshTokenStore", () => {
    it("hashed refresh token 저장", async () => {
      jest.spyOn(bcrypt, "hashSync").mockReturnValue("hashedToken" as never);
      jest.spyOn(refreshTokenRepository, "upsert").mockResolvedValue({} as any);

      await service.refreshTokenStore(1, "refreshToken", "127.0.0.1", "test-agent");

      expect(bcrypt.hashSync).toHaveBeenCalledWith("refreshToken", AUTH_CONSTANT.HASH_SALT_ROUNDS);
      expect(refreshTokenRepository.upsert).toHaveBeenCalledWith(
        {
          userId: 1,
          refreshToken: "hashedToken",
          ip: "127.0.0.1",
          userAgent: "test-agent",
        },
        ["userId"],
      );
    });

    it("토큰 저장 실패 시 오류 발생", async () => {
      jest.spyOn(bcrypt, "hashSync").mockReturnValue("hashedToken" as never);
      jest.spyOn(refreshTokenRepository, "upsert").mockRejectedValue(new Error("Storage failed"));

      await expect(
        service.refreshTokenStore(1, "refreshToken", "127.0.0.1", "test-agent"),
      ).rejects.toThrow("Storage failed");
    });
  });
});
