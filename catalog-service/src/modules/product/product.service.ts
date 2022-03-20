import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { IProduct } from './interfaces/product.interface';
import { Product } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import * as slug from 'slug';
import { FindAllProductDto } from './dto/find-all-product.dto';
import mongoose from 'mongoose';
import {
  DEFAULT_DBQUERY_LIMIT,
  DEFAULT_DBQUERY_SKIP,
  DEFAULT_DBQUERY_SORT,
} from 'src/common/constants';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  async findOne(id: string): Promise<IProduct> {
    const foundProduct = await this.productModel.findById(id).exec();
    if (!foundProduct) {
      throw new NotFoundException('Product not found');
    }
    return foundProduct;
  }

  async findAll(query: FindAllProductDto): Promise<IProduct[]> {
    const {
      startId,
      skip,
      limit,
      sort,
      categoryId,
      price,
      name,
      isEnabled,
      isPublic,
      originalPrice,
      stockQuantity,
      soldQuantity,
    } = query;

    const filters = [];
    startId && filters.push({ _id: { $gt: startId } });
    categoryId &&
      filters.push({ categoryId: new mongoose.Types.ObjectId(categoryId) });
    name && filters.push({ name });
    isEnabled && filters.push({ isEnabled });
    isPublic && filters.push({ isPublic });
    price && filters.push({ price: price.toMongooseFormat() });
    originalPrice &&
      filters.push({ originalPrice: originalPrice.toMongooseFormat() });
    stockQuantity &&
      filters.push({ stockQuantity: stockQuantity.toMongooseFormat() });
    soldQuantity &&
      filters.push({ soldQuantity: soldQuantity.toMongooseFormat() });

    const dbQuery = this.productModel
      .aggregate()
      .match(filters.length === 0 ? {} : { $and: filters })
      .skip(skip ? skip : DEFAULT_DBQUERY_SKIP)
      .limit(limit ? limit : DEFAULT_DBQUERY_LIMIT)
      .append({
        $set: {
          _id: { $toString: '$_id' },
          categoryId: { $toString: '$categoryId' },
        },
      })
      .append({ $sort: sort ? sort : DEFAULT_DBQUERY_SORT });
    return await dbQuery.exec();
  }

  async create(dto: CreateProductDto): Promise<IProduct> {
    const productName = dto.name;
    // check uniqueness of name
    const productByName = await this.productModel
      .findOne({
        name: productName,
      })
      .exec();
    if (productByName) {
      throw new ConflictException('Product name is already exist');
    }

    const createdProduct = await this.productModel.create({
      ...dto,
      slug: slug(productName),
    });

    return createdProduct;
  }

  async update(id: string, dto: CreateProductDto): Promise<IProduct> {
    const existingProduct = this.productModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }
    return existingProduct;
  }

  async deleteOne(id: string): Promise<boolean> {
    const foundProduct = await this.productModel.findById(id);
    if (!foundProduct) {
      throw new NotFoundException('Product not found');
    }
    return (await foundProduct.delete()) && true;
  }
}