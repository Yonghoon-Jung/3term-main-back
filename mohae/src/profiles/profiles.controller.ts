import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { User } from '@sentry/node';
import { AwsService } from 'src/aws/aws.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import {
  JudgeDuplicateNicknameDto,
  UpdateProfileDto,
} from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

@UseGuards(AuthGuard('jwt'))
@Controller('profile')
@ApiTags('Profile')
export class ProfilesController {
  constructor(
    private profileService: ProfilesService,
    private awsService: AwsService,
  ) {}

  @Get('/:profileUserNo')
  async readUserProfile(
    @Param('profileUserNo') profileUserNo: number,
    @CurrentUser() user: User,
  ): Promise<object> {
    try {
      const response: object = await this.profileService.readUserProfile(
        profileUserNo,
        user.no,
      );
      return Object.assign({
        statusCode: 200,
        msg: '프로필 조회에 성공했습니다.',
        response,
      });
    } catch (err) {
      throw err;
    }
  }

  @Post('/check-nickname')
  async judgeDuplicateNickname(
    @Body() judgeDuplicateNicknameDto: JudgeDuplicateNicknameDto,
  ) {
    try {
      await this.profileService.judgeDuplicateNickname(
        judgeDuplicateNicknameDto,
      );

      return Object.assign({
        statusCode: 200,
        msg: '사용가능한 닉네임입니다.',
      });
    } catch (err) {
      throw err;
    }
  }

  @UseInterceptors(FileInterceptor('image'))
  @Patch()
  @UseGuards(AuthGuard())
  async updateProfile(
    @UploadedFile() file: Express.Multer.File,
    @Body() updateProfileDto: UpdateProfileDto,
    @CurrentUser() user: User,
  ): Promise<number> {
    try {
      const profilePhoto = file
        ? false
        : await this.awsService.uploadFileToS3('profile', file);

      const response: number = await this.profileService.updateProfile(
        user.no,
        updateProfileDto,
        profilePhoto,
      );
      return Object.assign({
        statusCode: 201,
        msg: '프로필 정보 수정이 완료되었습니다.',
        userNo: response,
      });
    } catch (err) {
      throw err;
    }
  }
}
