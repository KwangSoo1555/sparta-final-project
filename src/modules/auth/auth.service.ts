import * as nodemailer from "nodemailer";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { Redis } from "ioredis";

import {
  Injectable,
  HttpStatus,
  Inject,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";

import { UsersEntity } from "src/entities/users.entity";
import { RefreshTokensEntity } from "src/entities/refresh-tokens.entity";
import { EmailVerificationDto } from "./dto/email-verification.dto";
import { UserSignUpDto } from "./dto/sign-up.dto";
import { LocalSignInDto, SocialSignInDto } from "./dto/sign-in.dto";
import { FindPwDto } from "./dto/find-pw.dto";
import { JwtPayload } from "src/common/customs/types/jwt-payload.type";
import { JwtInput } from "src/common/customs/types/jwt-input.type";

import { MESSAGES } from "src/common/constants/message.constant";
import { AUTH_CONSTANT } from "src/common/constants/auth.constant";

@Injectable()
export class AuthService {
  private readonly jwtAccessKey: string;
  private readonly jwtRefreshKey: string;
  private readonly jwtAccessOptions: jwt.SignOptions;
  private readonly jwtRefreshOptions: jwt.SignOptions;

  constructor(
    @Inject("SMTP_TRANSPORT") private smtpTransport: nodemailer.Transporter,
    @Inject("REDIS_CLIENT") private redisClient: Redis,
    private configService: ConfigService,
    @InjectRepository(UsersEntity)
    private readonly userRepository: Repository<UsersEntity>,
    @InjectRepository(RefreshTokensEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokensEntity>,
  ) {
    this.jwtAccessKey = this.configService.get<string>("ACCESS_TOKEN_SECRET");
    this.jwtRefreshKey = this.configService.get<string>("REFRESH_TOKEN_SECRET");
    this.jwtAccessOptions = { expiresIn: AUTH_CONSTANT.ACCESS_TOKEN_EXPIRES_IN };
    this.jwtRefreshOptions = { expiresIn: AUTH_CONSTANT.REFRESH_TOKEN_EXPIRES_IN };
  }

  // 메일 인증 코드 발송
  async sendAuthEmail(emailVerificationDto: EmailVerificationDto) {
    const email = emailVerificationDto.email;
    const verificationCode = this.codeNumber(111111, 999999);
    const timestamp = Date.now();

    const mailOptions = {
      from: AUTH_CONSTANT.AUTH_EMAIL.FROM,
      to: email,
      subject: AUTH_CONSTANT.AUTH_EMAIL.SUBJECT,
      html: `
        <p>${AUTH_CONSTANT.AUTH_EMAIL.HTML}</p> <br>
        <p>${verificationCode}</p>
        `,
    };

    try {
      await this.redisClient.set(email, verificationCode, "EX", 300);

      await this.smtpTransport.sendMail(mailOptions);

      console.log("code:", verificationCode);

      const sendTime = new Date(timestamp).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
      });

      return {
        status: HttpStatus.OK,
        message: MESSAGES.AUTH.SIGN_UP.EMAIL.SUCCEED,
        data: {
          code: verificationCode,
          timestamp: sendTime,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(MESSAGES.AUTH.SIGN_UP.EMAIL.FAIL);
    }
  }

  private codeNumber(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // redis 에서 메일 인증 코드 조회
  async getVerificationCode(email: string): Promise<number | null> {
    const code = await this.redisClient.get(email);
    return code ? parseInt(code) : null;
  }

  // 임시 비밀번호 발송
  async sendTempPassword(emailVerificationDto: EmailVerificationDto) {
    const email = emailVerificationDto.email;
    const tempPassword = this.codeString();

    const mailOptions = {
      from: AUTH_CONSTANT.AUTH_EMAIL.FROM,
      to: email,
      subject: AUTH_CONSTANT.TEMP_PASSWORD_EMAIL.SUBJECT,
      html: `
        <p>${AUTH_CONSTANT.TEMP_PASSWORD_EMAIL.HTML}</p> <br>
        <p>${tempPassword}</p>
        `,
    };

    await this.redisClient.set(email, tempPassword);

    await this.smtpTransport.sendMail(mailOptions);

    console.log("tempPassword:", tempPassword);

    return {
      status: HttpStatus.OK,
      message: MESSAGES.AUTH.SIGN_UP.EMAIL.SUCCEED,
      data: {
        tempPassword: tempPassword,
      },
    };
  }

  private codeString() {
    return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
  }

  // redis 에서 임시 비밀번호 조회
  async getTempPassword(email: string): Promise<string | null> {
    const tempPassword = await this.redisClient.get(email);
    return tempPassword || null;
  }

  // auth 관련 메서드
  // 유저 존재 여부 확인
  checkUserForAuth(params: { email?: string; id?: number }) {
    return this.userRepository.findOne({ where: { ...params } });
  }

  async signUp(signUpDto: UserSignUpDto) {
    const { email, name, password, verificationCode } = signUpDto;
    const existingUser = await this.checkUserForAuth({ email });

    // 정상 상태에서 활동하는 유저면 중복 회원 가입 불가
    if (existingUser && existingUser.deletedAt === null)
      throw new ConflictException(MESSAGES.AUTH.SIGN_UP.EMAIL.DUPLICATED);

    // 이메일 인증 코드 확인
    const sendedEmailCode = await this.getVerificationCode(email);
    if (!sendedEmailCode || sendedEmailCode !== verificationCode)
      throw new BadRequestException(MESSAGES.AUTH.SIGN_UP.EMAIL.VERIFICATION_CODE.INCONSISTENT);

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, AUTH_CONSTANT.HASH_SALT_ROUNDS);

    // 탈퇴한 유저면 복구
    const softDeletedUser = await this.userRepository.findOne({
      where: { email },
      withDeleted: true,
    });

    let registeredUser;
    if (softDeletedUser) {
      softDeletedUser.deletedAt = null;
      softDeletedUser.name = name;
      softDeletedUser.password = hashedPassword;
      registeredUser = await this.userRepository.save(softDeletedUser);
    } else {
      // 새 유저 생성
      const user = this.userRepository.create({
        email,
        name,
        password: hashedPassword,
      });
      registeredUser = await this.userRepository.save(user);
    }

    registeredUser.password = undefined;

    const { password: _, verificationCode: __, ...result } = registeredUser;

    await this.redisClient.del(email);

    return result;
  }

  async signIn(signInDto: LocalSignInDto, ip: string, userAgent: string) {
    const { email, password } = signInDto;
    const user = await this.checkUserForAuth({ email });

    // 유저 존재 여부 확인
    if (!user) throw new NotFoundException(MESSAGES.AUTH.SIGN_IN.EMAIL.NOT_FOUND);

    // 비밀번호 일치 여부 확인
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch)
      throw new UnauthorizedException(MESSAGES.AUTH.SIGN_IN.PASSWORD.INCONSISTENT);

    const accessToken = this.createToken({ userId: user.id });
    const refreshToken = this.createToken({ userId: user.id }, true);

    await this.refreshTokenStore(user.id, refreshToken, ip, userAgent);

    return { accessToken, refreshToken, role: "user" };
  }

  async socialSignIn(
    user: any,
    ip: string,
    userAgent: string,
    authCode: string,
    res: any,
  ): Promise<string[] | void> {
    try {
      const email = user.email;
      let userId: number;

      // 탈퇴한 유저면 복구
      const softDeletedUser = await this.userRepository.findOne({
        where: { email },
        withDeleted: true,
      });

      if (softDeletedUser) {
        // 탈퇴한 유저면 복구
        softDeletedUser.deletedAt = null;
        const recoveredUser = await this.userRepository.save(softDeletedUser);
        userId = recoveredUser.id;
      } else {
        // 원래 정상 상태로 존재하는 유저
        const checkUser = await this.checkUserForAuth({ email });
        if (checkUser) {
          userId = checkUser.id;
        } else {
          // 새로운 유저
          const newUser = await this.userRepository.save(user);
          userId = newUser.id;
        }
      }

      const accessToken = this.createToken({ userId });
      const refreshToken = this.createToken({ userId }, true);

      await this.refreshTokenStore(userId, refreshToken, ip, userAgent);

      await this.redisClient.hmset(authCode, {
        accessToken: accessToken,
        refreshToken: refreshToken,
        role: user.role,
      });
      await this.redisClient.expire(authCode, 10);

      return res.redirect(
        `https://sparta-final-project.netlify.app/auth/social-login?code=${authCode}`,
      );
    } catch (error) {
      throw new UnauthorizedException(MESSAGES.AUTH.SIGN_IN.EMAIL.NOT_FOUND);
    }
  }

  async getAuthCode(authCode: string) {
    const fields = ["accessToken", "refreshToken", "role"];
    return this.redisClient.hmget(authCode, ...fields);
  }

  async tokenReissue(userId: number, refreshToken: string, ip: string, userAgent: string) {
    // refresh token 을 가지고 있는 유저인지 확인
    const existingRefreshToken = await this.refreshTokenRepository.findOne({ where: { userId } });
    if (!existingRefreshToken) throw new UnauthorizedException(MESSAGES.AUTH.COMMON.JWT.INVALID);

    // 제출된 refresh token 과 저장된 refresh token 이 일치하는지 확인
    const matchRefreshToken = await bcrypt.compare(refreshToken, existingRefreshToken.refreshToken);
    if (!matchRefreshToken) throw new UnauthorizedException(MESSAGES.AUTH.COMMON.JWT.INVALID);

    // access token 과 refresh token 을 새롭게 발급
    const reIssueAccessToken = this.createToken({ userId });
    const reIssueRefreshToken = this.createToken({ userId }, true);

    await this.refreshTokenStore(userId, reIssueRefreshToken, ip, userAgent);

    return {
      accessToken: reIssueAccessToken,
      refreshToken: reIssueRefreshToken,
    };
  }

  async findPw(findPwDto: FindPwDto) {
    const { email, name, tempPassword } = findPwDto;
    const user = await this.userRepository.findOne({ where: { email, name } });

    if (!user) throw new NotFoundException("가입되지 않은 계정입니다.");

    // 임시 비밀번호
    const inputTempPassword = await this.getTempPassword(email);
    if (tempPassword !== inputTempPassword)
      throw new NotFoundException("잘못된 임시 비밀번호입니다.");

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(inputTempPassword, AUTH_CONSTANT.HASH_SALT_ROUNDS);

    // 비밀번호 업데이트
    await this.userRepository.update(user.id, { password: hashedPassword });

    await this.redisClient.del(email);

    return {
      status: HttpStatus.OK,
      message: "비밀번호가 임시 비밀번호로 변경되었습니다.",
      data: {
        password: inputTempPassword,
      },
    };
  }

  async signOut(userId: number) {
    await this.refreshTokenRepository.update({ userId }, { refreshToken: null });

    return {
      message: MESSAGES.AUTH.SIGN_OUT.SUCCEED,
    };
  }

  verifyToken(token: string): JwtPayload {
    try {
      const secret = this.configService.get<string>("ACCESS_TOKEN_SECRET");
      return jwt.verify(token, secret) as JwtPayload;
    } catch (error) {
      throw new UnauthorizedException(MESSAGES.AUTH.TOKEN.INVALID);
    }
  }

  createToken(jwtInput: JwtInput, isRefresh?: boolean): string {
    try {
      const payload: JwtPayload = {
        ...jwtInput,
        type: isRefresh ? "REFRESH" : "ACCESS",
      };
      const key = isRefresh ? this.jwtRefreshKey : this.jwtAccessKey;
      const options = isRefresh ? this.jwtRefreshOptions : this.jwtAccessOptions;

      return jwt.sign(payload, key, options);
    } catch (error) {
      throw new Error(MESSAGES.AUTH.TOKEN.OCCURRED_ERROR);
    }
  }

  async refreshTokenStore(userId: number, refreshToken: string, ip: string, userAgent: string) {
    // refresh token 해싱
    const hashedRefreshToken = bcrypt.hashSync(refreshToken, AUTH_CONSTANT.HASH_SALT_ROUNDS);

    // hashed refresh token 을 jwt entity 에 저장
    await this.refreshTokenRepository.upsert(
      {
        userId,
        refreshToken: hashedRefreshToken,
        ip,
        userAgent,
      },
      ["userId"],
    );
  }
}
