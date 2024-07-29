import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Headers,
  Ip,
  Request,
  Response,
} from "@nestjs/common";

import { Request as ExpressRequest, Response as ExpressResponse } from "express";

import { AuthGuard } from "@nestjs/passport";
import { JwtRefreshGuards, JwtAccessGuards } from "./strategies/jwt-strategy";
import { RequestJwt } from "src/common/customs/decorators/jwt-request";

import { AuthService } from "./auth.service";

import { EmailVerificationDto } from "./dto/email-verification.dto";
import { UserSignUpDto } from "./dto/sign-up.dto";
import { LocalSignInDto, GoogleSignInDto, NaverSignInDto, KakaoSignInDto } from "./dto/sign-in.dto";
import { FindPwDto } from "./dto/find-pw.dto";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("email/verification")
  @UsePipes(ValidationPipe)
  async sendAuthEmail(@Body() emailVerificationDto: EmailVerificationDto) {
    return this.authService.sendAuthEmail(emailVerificationDto);
  }

  @Post("email/temp-pw")
  @UsePipes(ValidationPipe)
  async sendTempPassword(@Body() emailVerificationDto: EmailVerificationDto) {
    return this.authService.sendTempPassword(emailVerificationDto);
  }

  // user auth 관련 api
  @Post("sign-up")
  @UsePipes(ValidationPipe)
  signUp(@Body() signUpDto: UserSignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post("sign-in")
  @UsePipes(ValidationPipe)
  signIn(
    @Ip() ip: string,
    @Headers("User-Agent") userAgent: string,
    @Body() signInDto: LocalSignInDto,
  ) {
    return this.authService.signIn(signInDto, ip, userAgent);
  }

  @Get("google")
  @UseGuards(AuthGuard("google"))
  async googleAuth(@Request() req: ExpressRequest) {
    console.log("Google Auth Request:", req.user); // 콘솔 로그 추가
  }

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleAuthCallback(
    @Request() request: ExpressRequest,
    @Response() response: ExpressResponse,
  ): Promise<ExpressResponse | void> {
    console.log("Google Auth Callback Request:", request.user); // 콘솔 로그 추가
    await this.authService.googleSignIn(request, response);
    return response;
  }

  // @Get("naver")
  // @UseGuards(AuthGuard("naver"))
  // async naverAuth(@Request() req: ExpressRequest) {
  //   console.log(req);
  // }

  // @Get("naver/callback")
  // @UseGuards(AuthGuard("naver"))
  // async naverAuthCallback(
  //   @Request() request: ExpressRequest,
  //   @Response() response: ExpressResponse,
  // ): Promise<ExpressResponse | void> {
  //   console.log("Naver Auth Callback Request:", request); // 콘솔 로그 추가
  //   return await this.authService.naverSignIn(request, response);
  // }

  // @Get("kakao")
  // @UseGuards(AuthGuard("kakao"))
  // async kakaoAuth(@Request() req: ExpressRequest) {
  //   console.log(req);
  // }

  // @Get("kakao/callback")
  // @UseGuards(AuthGuard("kakao"))
  // async kakaoAuthCallback(
  //   @Request() request: ExpressRequest,
  //   @Response() response: ExpressResponse,
  // ): Promise<ExpressResponse | void> {
  //   return await this.authService.kakaoSignIn(request, response);
  // }

  @Post("jwt-reissue")
  @UseGuards(JwtRefreshGuards)
  @UsePipes(ValidationPipe)
  tokenReissue(
    @RequestJwt() { user: { id: userId }, token: refreshToken },
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ) {
    return this.authService.tokenReissue(userId, refreshToken, ip, userAgent);
  }

  @Post("find-pw")
  async findPw(@Body() findPwDto: FindPwDto) {
    return this.authService.findPw(findPwDto);
  }

  @Patch("sign-out")
  @UseGuards(JwtRefreshGuards)
  signOut(@RequestJwt() { user: { id: userId } }) {
    return this.authService.signOut(userId);
  }
}
