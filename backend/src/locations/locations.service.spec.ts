import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { FavoriteLocation } from '../entities/favorite-location.entity';

const makeLoc = (overrides: Partial<FavoriteLocation> = {}): FavoriteLocation =>
  ({
    id: 'loc-1',
    userProfileId: 'user-1',
    name: 'Home',
    address: '123 Main St',
    latitude: 23.8,
    longitude: 90.4,
    locationType: 'home',
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as FavoriteLocation);

const makeRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
});

describe('LocationsService', () => {
  let service: LocationsService;
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    repo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: getRepositoryToken(FavoriteLocation), useValue: repo },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
  });

  describe('createFavoriteLocation', () => {
    it('should create location successfully', async () => {
      const loc = makeLoc({ locationType: 'other' });
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(loc);
      repo.save.mockResolvedValue(loc);

      const result = await service.createFavoriteLocation('user-1', {
        name: 'Office',
        address: 'Office Rd',
        latitude: 23.8,
        longitude: 90.4,
        locationType: 'other',
      });
      expect(result).toEqual(loc);
    });

    it('should reject duplicate home location', async () => {
      repo.findOne.mockResolvedValue(makeLoc());
      await expect(
        service.createFavoriteLocation('user-1', {
          name: 'Home 2',
          address: 'Alt St',
          latitude: 23.8,
          longitude: 90.4,
          locationType: 'home',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByUserProfileId', () => {
    it('should return all locations for user', async () => {
      const locs = [makeLoc(), makeLoc({ id: 'loc-2' })];
      repo.find.mockResolvedValue(locs);
      const result = await service.findByUserProfileId('user-1');
      expect(result).toEqual(locs);
    });
  });

  describe('updateFavoriteLocation', () => {
    it('should throw NotFoundException if not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.updateFavoriteLocation('bad', 'user-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not own it', async () => {
      repo.findOne.mockResolvedValue(makeLoc({ userProfileId: 'other' }));
      await expect(service.updateFavoriteLocation('loc-1', 'user-1', {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should update and return the location', async () => {
      const loc = makeLoc();
      const updated = { ...loc, name: 'Updated Home' };
      repo.findOne.mockResolvedValue(loc);
      repo.save.mockResolvedValue(updated);

      const result = await service.updateFavoriteLocation('loc-1', 'user-1', { name: 'Updated Home' });
      expect(result.name).toBe('Updated Home');
    });

    it('should reject changing to home if another home exists', async () => {
      const loc = makeLoc({ locationType: 'work' });
      repo.findOne
        .mockResolvedValueOnce(loc)                              // first call: the location being updated
        .mockResolvedValueOnce(makeLoc({ id: 'other-home' }));   // second call: existing home with different id

      await expect(
        service.updateFavoriteLocation('loc-1', 'user-1', { locationType: 'home' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteFavoriteLocation', () => {
    it('should throw NotFoundException if not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.deleteFavoriteLocation('bad', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not own it', async () => {
      repo.findOne.mockResolvedValue(makeLoc({ userProfileId: 'other' }));
      await expect(service.deleteFavoriteLocation('loc-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should remove the location successfully', async () => {
      const loc = makeLoc();
      repo.findOne.mockResolvedValue(loc);
      repo.remove.mockResolvedValue(undefined);

      await expect(service.deleteFavoriteLocation('loc-1', 'user-1')).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith(loc);
    });
  });
});
