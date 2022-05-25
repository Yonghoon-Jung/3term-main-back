import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@sentry/node';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './entity/review.entity';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
@ApiTags('Reviews')
export class ReviewsController {
  constructor(private reviewService: ReviewsService) {}

  @ApiOperation({
    summary: '리뷰 전체 조회',
    description: '리뷰 전체 조회 API',
  })
  @Get()
  async readAllReview(): Promise<Review[]> {
    const response = await this.reviewService.readAllReview();

    return Object.assign({
      statusCode: 200,
      msg: `전체 리뷰 조회가 완료되었습니다.`,
      response,
    });
  }

  @ApiOperation({
    summary: '마이페이지에 나타나는 유저 리뷰',
    description: '마이페이지에 나타나는 유저 리뷰 조회 API',
  })
  @Get(':userNo')
  async readUserReviews(@Param('userNo') userNo: number) {
    const response = await this.reviewService.readUserReviews(userNo);

    return Object.assign({
      statusCode: 200,
      msg: `유저의 리뷰가 조회되었습니다.`,
      response,
    });
  }

  @ApiOperation({
    summary: '리뷰 작성',
    description: '리뷰 작성 API',
  })
  @UseGuards(AuthGuard())
  @Post()
  async createReview(
    @CurrentUser() reviewer: User,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    const response = await this.reviewService.createReview(
      reviewer,
      createReviewDto,
    );

    return Object.assign({
      statusCode: 201,
      msg: '리뷰 생성이 완료되었습니다.',
      response,
    });
  }

  @Get('/check/:boardNo')
  @UseGuards(AuthGuard())
  async checkDuplicateReview(
    @CurrentUser() reviewer: User,
    @Param('boardNo') boardNo: number,
  ) {
    const response = await this.reviewService.checkDuplicateReview(
      reviewer,
      boardNo,
    );

    return {
      msg: '중복이다.',
    };
  }
}
