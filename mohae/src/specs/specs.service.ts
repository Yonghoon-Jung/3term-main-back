import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { throwIfEmpty } from 'rxjs';
import { UserRepository } from 'src/auth/repository/user.repository';
import { SpecPhotoRepository } from 'src/photo/repository/photo.repository';
import { UpdateSpecDto } from './dto/spec.dto';
import { SpecRepository } from './repository/spec.repository';

@Injectable()
export class SpecsService {
  constructor(
    @InjectRepository(SpecRepository)
    private specRepository: SpecRepository,
    private userRepository: UserRepository,
    private specPhotoRepository: SpecPhotoRepository,
  ) {}
  async getAllSpec(no: number) {
    try {
      const specs = await this.specRepository.getAllSpec(no);

      return specs;
    } catch (err) {
      throw err;
    }
  }

  async getOneSpec(no: number) {
    try {
      const spec = await this.specRepository.getOneSpec(no);

      return spec;
    } catch (err) {
      throw err;
    }
  }

  async registSpec(createSpecDto) {
    try {
      const { userNo, specPhoto } = createSpecDto;
      const user = await this.userRepository.findOne(userNo, {
        relations: ['specs'],
      });
      if (user) {
        const specNo = await this.specRepository.registSpec(
          createSpecDto,
          user,
        );
        // registSpec 해서 가져온 specNO 값은 [{no : 새로 생성된 스팩 고유번호}] 이런식으로 넘어옴.
        const spec = await this.specRepository.findOne(specNo[0].no, {
          relations: ['specPhoto'],
        });
        if (specPhoto.length === 0) {
          throw new BadRequestException(
            '스펙의 사진이 없다면 null 이라도 넣어주셔야 스펙 등록이 가능합니다.',
          );
        }

        for (const photo of specPhoto) {
          const specPhotoNo = await this.specPhotoRepository.saveSpecPhoto(
            photo,
            //spec를 집어 넣어주는 것이 point 이때 photo_url 이 없다면?
            spec,
          );
          const specPhotoRepo = await this.specPhotoRepository.findOne(
            specPhotoNo[0].no,
          );
          spec.specPhoto.push(specPhotoRepo);
        }

        if (spec) {
          user.specs.push(spec);
        }
        return new InternalServerErrorException(
          '스펙등록 중 발생한 서버에러입니다.',
        );
      }
      return new UnauthorizedException(
        `${userNo}에 해당하는 유저가 존재하지 않습니다.`,
      );
    } catch (err) {
      throw err;
    }
  }

  // specphotourl 변경되어 들어갈 수 있도록 수정!
  async updateSpec(specNo, updateSpec) {
    try {
      const isupdate = await this.specRepository.updateSpec(specNo, updateSpec);
      if (!isupdate) {
        throw new InternalServerErrorException(
          '스팩 업데이트가 제대로 이루어지지 않았습니다.',
        );
      }
      return isupdate;
    } catch (err) {
      throw err;
    }
  }

  async deleteSpec(specNo) {
    try {
      const isDelete = await this.specRepository.deleteSpec(specNo);

      if (!isDelete) {
        throw new InternalServerErrorException(
          '스팩 삭제가 제대로 이루어지지 않았습니다.',
        );
      }
      return isDelete;
    } catch (err) {
      throw err;
    }
  }
}
