import { Test, TestingModule } from "@nestjs/testing";
import {
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";

import { AuthService } from "../../src/modules/auth/auth.service";
import { AuthController } from "../../src/modules/auth/auth.controller";

import { EmailVerificationDto } from "../../src/modules/auth/dto/email-verification.dto";
import { UserSignUpDto } from "../../src/modules/auth/dto/sign-up.dto";
import { LocalSignInDto } from "../../src/modules/auth/dto/sign-in.dto";
import { MESSAGES } from "../../src/common/constants/message.constant";

jest.mock("../../src/modules/auth/auth.service");

describe("AuthController", () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthService],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("signUp", () => {
    const signUpDto: UserSignUpDto = {
      email: "test@example.com",
      name: "test",
      password: "password",
      verificationCode: 123456,
    };

    it("회원가입 성공 시 사용자 정보 반환", async () => {
      const result = { id: 1, email: signUpDto.email };
      jest.spyOn(authService, "signUp").mockResolvedValue(result as any);

      expect(await controller.signUp(signUpDto)).toEqual(result);
      expect(authService.signUp).toHaveBeenCalledWith(signUpDto);
    });

    it("이미 존재하는 사용자일 경우 ConflictException 발생", async () => {
      jest
        .spyOn(authService, "signUp")
        .mockRejectedValue(new ConflictException(MESSAGES.AUTH.SIGN_UP.EMAIL.DUPLICATED));

      await expect(controller.signUp(signUpDto)).rejects.toThrow(ConflictException);
    });

    it("인증 코드가 일치하지 않을 경우 BadRequestException 발생", async () => {
      jest
        .spyOn(authService, "signUp")
        .mockRejectedValue(
          new BadRequestException(MESSAGES.AUTH.SIGN_UP.EMAIL.VERIFICATION_CODE.INCONSISTENT),
        );

      await expect(controller.signUp(signUpDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("signIn", () => {
    const signInDto: LocalSignInDto = { email: "test@example.com", password: "password" };

    it("로그인 성공 시 토큰과 역할 반환", async () => {
      const result = { accessToken: "accessToken", refreshToken: "refreshToken", role: "user" };
      jest.spyOn(authService, "signIn").mockResolvedValue(result as any);

      expect(await controller.signIn("127.0.0.1", "test-agent", signInDto)).toEqual(result);
      expect(authService.signIn).toHaveBeenCalledWith(signInDto, "127.0.0.1", "test-agent");
    });

    it("잘못된 자격 증명으로 로그인 시 UnauthorizedException 발생", async () => {
      jest
        .spyOn(authService, "signIn")
        .mockRejectedValue(new UnauthorizedException(MESSAGES.AUTH.SIGN_IN.EMAIL.NOT_FOUND));

      await expect(controller.signIn("127.0.0.1", "test-agent", signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("sendAuthEmail", () => {
    const emailVerificationDto: EmailVerificationDto = { email: "test@example.com" };

    it("인증 이메일 발송 성공", async () => {
      const result = { status: 200, message: MESSAGES.AUTH.SIGN_UP.EMAIL.SUCCEED };
      jest.spyOn(authService, "sendAuthEmail").mockResolvedValue(result as any);

      expect(await controller.sendAuthEmail(emailVerificationDto)).toEqual(result);
      expect(authService.sendAuthEmail).toHaveBeenCalledWith(emailVerificationDto);
    });

    it("이메일 발송 실패 시 에러 발생", async () => {
      jest
        .spyOn(authService, "sendAuthEmail")
        .mockRejectedValue(new Error(MESSAGES.AUTH.SIGN_UP.EMAIL.FAIL));

      await expect(controller.sendAuthEmail(emailVerificationDto)).rejects.toThrow(Error);
    });
  });

  describe("tokenReissue", () => {
    const mockUser = { id: 1 };
    const mockRequest = { user: mockUser, token: "refreshToken" };
    const mockIp = "127.0.0.1";
    const mockUserAgent = "test-agent";

    it("토큰 재발급 성공", async () => {
      const result = { accessToken: "newAccessToken", refreshToken: "newRefreshToken" };
      jest.spyOn(authService, "tokenReissue").mockResolvedValue(result as any);

      expect(await controller.tokenReissue(mockRequest as any, mockIp, mockUserAgent)).toEqual(
        result,
      );
      expect(authService.tokenReissue).toHaveBeenCalledWith(
        mockUser.id,
        mockRequest.token,
        mockIp,
        mockUserAgent,
      );
    });

    it("유효하지 않은 리프레시 토큰으로 재발급 시도 시 UnauthorizedException 발생", async () => {
      jest
        .spyOn(authService, "tokenReissue")
        .mockRejectedValue(new UnauthorizedException(MESSAGES.AUTH.TOKEN.INVALID));

      await expect(
        controller.tokenReissue(mockRequest as any, mockIp, mockUserAgent),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("signOut", () => {
    const mockUser = { id: 1 };
    const mockRequest = { user: mockUser, token: "refreshToken" };
    const result = { status: 200, message: MESSAGES.AUTH.SIGN_OUT.SUCCEED };

    it("로그아웃 성공", async () => {
      jest.spyOn(authService, "signOut").mockResolvedValue(result as any);

      expect(await controller.signOut(mockRequest as any)).toEqual(result);
      expect(authService.signOut).toHaveBeenCalledWith(mockUser.id);
    });

    it("로그아웃 실패 시 에러 발생", async () => {
      jest.spyOn(authService, "signOut").mockRejectedValue(new Error("Logout failed"));

      await expect(controller.signOut(mockRequest as any)).rejects.toThrow(Error);
    });
  });

  describe("findPw", () => {
    const findPwDto = { email: "test@example.com", name: "Test User", tempPassword: "temp123" };

    it("비밀번호 찾기 성공", async () => {
      const result = {
        status: 200,
        message: "비밀번호가 임시 비밀번호로 변경되었습니다.",
        data: { password: "temp123" },
      };
      jest.spyOn(authService, "findPw").mockResolvedValue(result as any);

      expect(await controller.findPw(findPwDto)).toEqual(result);
      expect(authService.findPw).toHaveBeenCalledWith(findPwDto);
    });

    it("존재하지 않는 사용자로 비밀번호 찾기 시도 시 NotFoundException 발생", async () => {
      jest
        .spyOn(authService, "findPw")
        .mockRejectedValue(new NotFoundException(MESSAGES.AUTH.SIGN_IN.EMAIL.NOT_FOUND));

      await expect(controller.findPw(findPwDto)).rejects.toThrow(NotFoundException);
    });

    it("임시 비밀번호가 일치하지 않을 경우 BadRequestException 발생", async () => {
      jest
        .spyOn(authService, "findPw")
        .mockRejectedValue(new BadRequestException(MESSAGES.AUTH.SIGN_IN.PASSWORD.INCONSISTENT));

      await expect(controller.findPw(findPwDto)).rejects.toThrow(BadRequestException);
    });
  });
});
