import { EntityRepository, Repository } from 'typeorm';
import { CreateUserDto } from '../dto/auth-credential.dto';
import { User } from '../entity/user.entity';
import * as bcrypt from 'bcryptjs';
import { InternalServerErrorException } from '@nestjs/common';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
  // 인증 관련 부분
  async createUser(createUserDto: CreateUserDto, school, major): Promise<User> {
    try {
      const { email, password, phone, nickname, manager, name, photo_url } =
        createUserDto;
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(password, salt);
      const user = this.create({
        email,
        school,
        major,
        salt: hashedPassword,
        name,
        phone,
        nickname,
        manager,
        photo_url,
      });

      await user.save();
      return user;
    } catch (e) {
      throw new InternalServerErrorException(
        '서버에러입니다 서버 담당자에게 말해주세요',
      );
    }
  }

  async signIn(email: string) {
    try {
      const user = await this.createQueryBuilder('users')
        .where('users.email = :email', { email })
        .getOne();

      return user;
    } catch (e) {
      throw new InternalServerErrorException(
        `${e} ### 로그인 : 알 수 없는 서버 에러입니다.`,
      );
    }
  }

  async signDown(no: number) {
    try {
      const result = await this.createQueryBuilder()
        .softDelete()
        .from(User)
        .where('no = :no', { no })
        .execute();
      return result;
    } catch (err) {
      throw err;
    }
  }
  async duplicateCheck(string, duplicateCheck) {
    try {
      const duplicate = await this.createQueryBuilder('users')
        .where(`users.${string}= :duplicateCheck`, { duplicateCheck })
        .getOne();

      return duplicate;
    } catch (e) {
      throw new InternalServerErrorException(
        `${e} ### 중복체크 : 알 수 없는 서버 에러입니다.`,
      );
    }
  }

  async clearLoginCount(userNo) {
    try {
      await this.createQueryBuilder()
        .update(User)
        .set({ loginFailCount: 0 })
        .where('no = :no', { no: userNo })
        .execute();
    } catch (e) {
      throw e;
    }
  }

  async plusLoginFailCount({ no, loginFailCount }) {
    try {
      const { affected } = await this.createQueryBuilder()
        .update(User)
        .set({ loginFailCount: loginFailCount + 1 })
        .where('no = :no', { no })
        .execute();

      return affected;
    } catch (e) {
      throw e;
    }
  }
  async changeIsLock(userNo, isLock) {
    try {
      return await this.createQueryBuilder()
        .update(User)
        .set({ isLock: !isLock })
        .where('no = :no', { no: userNo })
        .execute();
    } catch (e) {
      throw e;
    }
  }

  async changePassword(email, hashedPassword) {
    try {
      return await this.createQueryBuilder()
        .update(User)
        .set({ salt: hashedPassword })
        .where('email = :email', { email })
        .execute();
    } catch (e) {
      throw e;
    }
  }
  // 프로필 관련 기능
  async findOneUser(no: number) {
    try {
      const user = await this.createQueryBuilder('users')
        .leftJoinAndSelect('users.boards', 'boards')
        .leftJoinAndSelect('users.school', 'school')
        .leftJoinAndSelect('users.major', 'major')
        .leftJoinAndSelect('users.reports', 'reports')
        .leftJoinAndSelect('users.specs', 'specs')
        .leftJoinAndSelect('users.categories', 'categories')
        .leftJoinAndSelect('users.likedMe', 'likedMe')
        .select([
          'users.no',
          'users.email',
          'users.nickname',
          'users.createdAt',
          'likedMe',
          'boards.no',
          'boards.title',
          'boards.target',
          'school.no',
          'school.name',
          'major.no',
          'major.name',
          'specs.no',
          'specs.title',
          'categories.no',
          'categories.name',
        ])
        .where('users.no = :no', { no })
        .getOne();

      return user;
    } catch (e) {
      throw new InternalServerErrorException(
        `${e} ### 유저 프로필 선택 조회 : 알 수 없는 서버 에러입니다.`,
      );
    }
  }

  async findOneUserinfo(no: number) {
    try {
      const user = await this.createQueryBuilder('users')
        .select(['no', 'email', 'nickname', 'name'])
        .where('no = :no', { no })
        .getOne();

      return user;
    } catch (err) {
      throw err;
    }
  }
}
