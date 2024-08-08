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
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";

import { UsersEntity } from "src/entities/users.entity";
import { RefreshTokensEntity } from "src/entities/refresh-tokens.entity";
import { EmailVerificationDto } from "./dto/email-verification.dto";
import { UserSignUpDto } from "./dto/sign-up.dto";
import { LocalSignInDto, GoogleSignInDto, NaverSignInDto, KakaoSignInDto } from "./dto/sign-in.dto";
import { FindPwDto } from "./dto/find-pw.dto";
import { JwtPayload } from "src/common/customs/types/jwt-payload.type";
import { JwtInput } from "src/common/customs/types/jwt-input.type";

import { MESSAGES } from "src/common/constants/message.constant";
import { AUTH_CONSTANT } from "src/common/constants/auth.constant";

@Injectable()
export class AuthService {
  private readonly smtpTransport: nodemailer.Transporter;
  private readonly jwtAccessKey: string;
  private readonly jwtRefreshKey: string;
  private readonly jwtAccessOptions: jwt.SignOptions;
  private readonly jwtRefreshOptions: jwt.SignOptions;

  constructor(
    @Inject("REDIS_CLIENT") private redisClient: Redis,
    private configService: ConfigService,
    @InjectRepository(UsersEntity)
    private readonly userRepository: Repository<UsersEntity>,
    @InjectRepository(RefreshTokensEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokensEntity>,
  ) {
    this.smtpTransport = nodemailer.createTransport({
      service: "naver",
      auth: {
        user: this.configService.get<string>("MAIL_AUTH_USER"),
        pass: this.configService.get<string>("MAIL_AUTH_PASS"),
      },
    });
    this.jwtAccessKey = this.configService.get<string>("ACCESS_TOKEN_SECRET");
    this.jwtRefreshKey = this.configService.get<string>("REFRESH_TOKEN_SECRET");
    this.jwtAccessOptions = { expiresIn: AUTH_CONSTANT.ACCESS_TOKEN_EXPIRES_IN };
    this.jwtRefreshOptions = { expiresIn: AUTH_CONSTANT.REFRESH_TOKEN_EXPIRES_IN };
  }

  private codeNumber(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private codeString() {
    return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
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

    await this.redisClient.set(email, verificationCode);
    await this.redisClient.set(`${email}:timestamp`, timestamp);

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
  }

  // redis 에서 메일 인증 코드 조회
  async getVerificationCode(email: string): Promise<number | null> {
    const code = await this.redisClient.get(email);
    return code ? parseInt(code) : null;
  }

  // redis 에서 메일 인증 코드 만료 여부 확인
  async isExpired(email: string) {
    const expirationTime = 5 * 60 * 1000; // 5분 뒤 코드 인증 만료
    const timestamp = await this.redisClient.get(`${email}:timestamp`);
    if (!timestamp) return true;
    return Date.now() > parseInt(timestamp) + expirationTime;
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

  // redis 에서 임시 비밀번호 조회
  async getTempPassword(email: string): Promise<string | null> {
    const tempPassword = await this.redisClient.get(email);
    return tempPassword || null;
  }

  // redis 에서 임시 비밀번호 삭제
  async deleteTempPassword(email: string) {
    await this.redisClient.del(email);
  }

  // auth 관련 메서드
  // 유저 존재 여부 확인
  checkUserForAuth(params: { email?: string; id?: number }) {
    return this.userRepository.findOne({ where: { ...params } });
  }

  async signUp(signUpDto: UserSignUpDto) {
    const { email, name, password, verificationCode, provider, socialId } = signUpDto;

    const existingUser = await this.checkUserForAuth({ email });
    if (existingUser) throw new ConflictException(MESSAGES.AUTH.SIGN_UP.EMAIL.DUPLICATED);

    // 소셜 회원가입 처리
    if (socialId) {
      const user = this.userRepository.create({
        email,
        name,
        socialId,
        provider,
      });

      return await this.userRepository.save(user);
    }

    // 소셜 회원가입이 아닌 로컬 회원가입 처리
    else {
      // 이메일 인증 코드 확인
      const sendedEmailCode = await this.getVerificationCode(email);
      const isExpired = await this.isExpired(email);
      if (!sendedEmailCode || isExpired || sendedEmailCode !== verificationCode)
        throw new BadRequestException(MESSAGES.AUTH.SIGN_UP.EMAIL.VERIFICATION_CODE.INCONSISTENT);

      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(password, AUTH_CONSTANT.HASH_SALT_ROUNDS);

      // 유저 생성
      const user = this.userRepository.create({
        email,
        name,
        password: hashedPassword,
      });

      const signUpUser = await this.userRepository.save(user);

      // 비밀번호 필드를 undefined로 설정
      signUpUser.password = undefined;

      return signUpUser;
    }
  }

  async signIn(signInDto: LocalSignInDto, ip: string, userAgent: string) {
    const user = await this.checkUserForAuth({ email: signInDto.email });

    // 유저 존재 여부 확인
    if (!user) throw new NotFoundException(MESSAGES.AUTH.LOG_IN.LOCAL.EMAIL.NOT_FOUND);

    // 비밀번호 일치 여부 확인
    const isPasswordMatch = await bcrypt.compare(signInDto.password, user.password);
    if (!isPasswordMatch)
      throw new UnauthorizedException(MESSAGES.AUTH.LOG_IN.LOCAL.PASSWORD.INCONSISTENT);

    const accessToken = this.createToken({ userId: user.id });
    const refreshToken = this.createToken({ userId: user.id }, true);

    await this.refreshTokenStore(user.id, refreshToken, ip, userAgent);

    return {
      accessToken,
      refreshToken,
    };
  }

  async socialSignIn(req: any, res: any): Promise<Response | void> {
    try {
      const user = req.user;

      if (!user) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          status: HttpStatus.BAD_REQUEST,
          message: MESSAGES.AUTH.LOG_IN.GOOGLE.EMAIL,
        });
      }

      const accessToken = this.createToken({ userId: user.id });
      const refreshToken = this.createToken({ userId: user.id }, true);

      const userAgent =
        req.headers["user-agent"] ||
        req.rawHeaders.find(
          (header, index) => header.toLowerCase() === "user-agent" && req.rawHeaders[index + 1],
        );
      const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

      await this.refreshTokenStore(user.id, refreshToken, ip, userAgent);

      return res.json({ accessToken, refreshToken });
    } catch (error) {
      throw new UnauthorizedException(MESSAGES.AUTH.LOG_IN.GOOGLE.EMAIL);
    }
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
    const user = await this.userRepository.findOne({
      where: { email: findPwDto.email, name: findPwDto.name },
    });
    
    if (!user) throw new NotFoundException("가입되지 않은 계정입니다.");

    // 임시 비밀번호
    const tempPassword = await this.getTempPassword(findPwDto.email);
    if (findPwDto.tempPassword !== tempPassword) {
      throw new NotFoundException("잘못된 임시 비밀번호입니다.");
    } else {
      await this.deleteTempPassword(findPwDto.email);
    }

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(tempPassword, AUTH_CONSTANT.HASH_SALT_ROUNDS);

    // 비밀번호 업데이트
    await this.userRepository.update(user.id, { password: hashedPassword });

    return {
      status: HttpStatus.OK,
      message: "비밀번호가 임시 비밀번호로 변경되었습니다.",
      data: {
        password: tempPassword,
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
    console.log(token);
    if (token.includes("access")) {
      return jwt.verify(token, this.jwtAccessKey) as JwtPayload;
    } else {
      return jwt.verify(token, this.jwtRefreshKey) as JwtPayload;
    }
  }

  createToken(jwtInput: JwtInput, isRefresh?: boolean): string {
    const payload: JwtPayload = {
      ...jwtInput,
      type: isRefresh ? "REFRESH" : "ACCESS",
    };
    const key = isRefresh ? this.jwtRefreshKey : this.jwtAccessKey;
    const options = isRefresh ? this.jwtRefreshOptions : this.jwtAccessOptions;

    return jwt.sign(payload, key, options);
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
