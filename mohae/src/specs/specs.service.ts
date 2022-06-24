import {
  BadGatewayException,
  BadRequestException,
  CACHE_MANAGER,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/auth/entity/user.entity';
import { UserRepository } from 'src/auth/repository/user.repository';
import { SpecPhotoRepository } from 'src/photo/repository/photo.repository';
import { ErrorConfirm } from 'src/common/utils/error';
import { CreateSpecDto } from './dto/create-spec.dto';
import { UpdateSpecDto } from './dto/update-spec.dto';
import { Spec } from './entity/spec.entity';
import { SpecRepository } from './repository/spec.repository';
import { Connection } from 'typeorm';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SpecsService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    @InjectRepository(SpecRepository)
    private readonly specRepository: SpecRepository,

    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,

    @InjectRepository(SpecPhotoRepository)
    private readonly specPhotoRepository: SpecPhotoRepository,

    private readonly configService: ConfigService,

    private readonly connection: Connection,
    private readonly errorConfirm: ErrorConfirm,
  ) {}

  async getSpecCacheData(key: string): Promise<Spec | Spec[]> {
    try {
      return await this.cacheManager.get<Spec | Spec[]>(key);
    } catch (err) {
      throw new InternalServerErrorException('스펙 캐시 데이터 조회 에러');
    }
  }

  async getAllSpec(profileUserNo: number): Promise<Spec | Spec[] | string> {
    try {
      const specs: Spec[] = await this.specRepository.getAllSpec(profileUserNo);

      if (!specs.length) {
        return '현재 등록된 스펙이 없습니다.';
      }

      await this.cacheManager.set(`specs_${profileUserNo}`, specs, {
        ttl: this.configService.get<number>('REDIS_SPEC_TTL'),
      });

      return specs;
    } catch (err) {
      throw err;
    }
  }

  async getOneSpec(specNo: number): Promise<Spec> {
    try {
      const spec: Spec = await this.specRepository.getOneSpec(specNo);

      this.errorConfirm.notFoundError(spec, '해당 스펙이 존재하지 않습니다.');

      return spec;
    } catch (err) {
      throw err;
    }
  }

  async registSpec(
    userNo: number,
    specPhotoUrls: any,
    createSpecDto: CreateSpecDto,
  ): Promise<void> {
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user: User = await this.userRepository.findOne(userNo, {
        relations: ['specs'],
      });

      const specNo: Spec = await queryRunner.manager
        .getCustomRepository(SpecRepository)
        .registSpec(createSpecDto, user);

      if (specPhotoUrls[0] !== 'default.jpg') {
        const specPhotos: object[] = specPhotoUrls.map(
          (photoUrl: string, index: number) => {
            return {
              photo_url: photoUrl,
              spec: specNo,
              order: index + 1,
            };
          },
        );
        const savedSpecPhotos: object[] = await queryRunner.manager
          .getCustomRepository(SpecPhotoRepository)
          .saveSpecPhoto(specPhotos);

        if (specPhotos.length !== savedSpecPhotos.length) {
          throw new InternalServerErrorException(
            '스펙 사진 등록 도중 DB관련 오류',
          );
        }

        await queryRunner.manager
          .getCustomRepository(SpecRepository)
          .addSpecPhoto(specNo, savedSpecPhotos);

        if (specNo) {
          await queryRunner.manager
            .getCustomRepository(UserRepository)
            .userRelation(userNo, specNo, 'specs');
        }
      }

      await this.cacheManager.del(`specs_${userNo}`);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateSpec(
    specNo: number,
    updateSpecDto: UpdateSpecDto,
    specPhotoUrls: false | string[],
    loginUserNo: number,
  ): Promise<any> {
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const spec: Spec = await this.specRepository.getOneSpec(specNo);

      this.errorConfirm.notFoundError(spec, '해당 스펙이 존재하지 않습니다.');

      await queryRunner.manager
        .getCustomRepository(SpecRepository)
        .updateSpec(specNo, updateSpecDto);

      if (specPhotoUrls) {
        const { specPhotos }: Spec = await this.specRepository.findOne(specNo, {
          select: ['no', 'specPhotos'],
          relations: ['specPhotos'],
        });
        if (specPhotos.length) {
          await queryRunner.manager
            .getCustomRepository(SpecPhotoRepository)
            .deleteBeforePhoto(spec.no);
        }
        if (specPhotoUrls[0] !== 'default.jpg') {
          const newSpecPhotos: Array<object> = specPhotoUrls.map(
            (photoUrl: string, index: number) => {
              return {
                photo_url: photoUrl,
                spec: specNo,
                order: index + 1,
              };
            },
          );
          await queryRunner.manager
            .getCustomRepository(SpecPhotoRepository)
            .saveSpecPhoto(newSpecPhotos);

          const originSpecPhotosUrl = specPhotos.map((specPhoto) => {
            return specPhoto.photo_url;
          });

          await queryRunner.commitTransaction();
          return originSpecPhotosUrl;
        }
      }

      await this.cacheManager.del(`specs_${loginUserNo}`);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteSpec(specNo: number, userNo: number): Promise<number> {
    try {
      const isDelete: number = await this.specRepository.deleteSpec(
        specNo,
        userNo,
      );
      if (!isDelete) {
        throw new ForbiddenException(
          '스펙의 작성자 만이 스펙을 삭제할 수 있습니다.',
        );
      }

      await this.cacheManager.del(`specs_${userNo}`);
      return isDelete;
    } catch (err) {
      throw err;
    }
  }

  async readUserSpec(
    userNo: number,
    take: number,
    page: number,
  ): Promise<Spec[]> {
    try {
      const profileSpecs: Spec[] = await this.specRepository.readUserSpec(
        userNo,
        take,
        page,
      );

      return profileSpecs;
    } catch (err) {
      throw err;
    }
  }
}
