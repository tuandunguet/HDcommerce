import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Model, FilterQuery } from 'mongoose';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ICategory } from './interfaces/category.interface';
import { Category } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import * as slugify from 'slug';
import { FindAllCategoryDto } from './dto/find-all-category.dto';
import { FindOneCategoryDto } from './dto/find-one-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import mongoose from 'mongoose';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
    @InjectConnection() private readonly dbConnection: mongoose.Connection,
  ) {}

  async findOne(id: string, query: FindOneCategoryDto): Promise<ICategory> {
    const dbQuery = this.categoryModel.findById(id);
    if (query.includeChildren) {
      dbQuery.populate('children');
    } else {
      dbQuery.select('-children');
    }
    const foundCategory = await dbQuery.exec();
    if (!foundCategory) {
      throw new NotFoundException('Category not found');
    }
    return foundCategory;
  }

  async findAll(query: FindAllCategoryDto): Promise<ICategory[]> {
    const { startId, skip, limit, sort, slug, includeChildren } = query;

    const filters: FilterQuery<Category> = startId
      ? {
          _id: { $gt: startId },
        }
      : {};
    slug && (filters.slug = slug);

    const dbQuery = this.categoryModel
      .find(filters)
      .sort(sort ? sort : { _id: 1 })
      .skip(skip)
      .limit(limit);

    if (includeChildren) {
      dbQuery.populate('children');
    } else {
      dbQuery.select('-children');
    }

    return await dbQuery.exec();
  }

  async create(dto: CreateCategoryDto): Promise<ICategory> {
    const { name, parentId } = dto;

    // check uniqueness of name
    const categoryByName = await this.categoryModel
      .findOne({
        name,
      })
      .exec();
    if (categoryByName) {
      throw new ConflictException('Category name is already exist');
    }

    const slug = slugify(name);

    if (!parentId) {
      return await this.categoryModel.create({ ...dto, path: [name], slug });
    } else {
      const parentCategory = await this.categoryModel.findById(parentId).exec();
      if (!parentCategory) {
        throw new NotFoundException('Parent category is not exist');
      }
      let createdCategory;
      const session = await this.dbConnection.startSession();
      session.startTransaction();
      try {
        // create the category
        createdCategory = await this.categoryModel.create({
          ...dto,
          path: parentCategory.path.concat(name),
          slug,
        });
        // add reference to its parent
        parentCategory.children.push(createdCategory._id);
        await parentCategory.save();

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
      return createdCategory;
    }
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<ICategory> {
    const newName = dto.name;
    const existingCategory = await this.categoryModel.findById(id);
    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    const oldName = existingCategory.name;
    Object.assign(existingCategory, dto);

    if (newName === oldName) {
      await existingCategory.save();
    } else {
      existingCategory.slug = slugify(newName);
      const session = await this.dbConnection.startSession();
      session.startTransaction();
      try {
        await existingCategory.save();
        const relatedCategories = await this.categoryModel.find({
          path: oldName,
        });
        await Promise.all(
          relatedCategories.map((category) => {
            category.path = category.path.map((i) =>
              i === oldName ? newName : i,
            );
            return category.save();
          }),
        );
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    }

    return await this.categoryModel.findById(id);
  }

  async deleteOne(id: string): Promise<boolean> {
    const foundCategory = await this.categoryModel.findById(id);
    if (!foundCategory) {
      throw new NotFoundException('Category not found');
    }

    const session = await this.dbConnection.startSession();
    session.startTransaction();
    try {
      // remove reference from its parent
      // await this.categoryModel.updateOne(
      // { children: id },
      // {
      // $pull: { children: id },
      // },
      // );
      // delete the category
      // await foundCategory.delete();
      // delete the subcategories
      const subcategories = await foundCategory.populate({
        path: 'children',
        populate: { path: 'children' },
      });
      console.log(subcategories);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    return true;
  }
}
