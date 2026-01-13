import { Logger, NotFoundException } from '@nestjs/common';
import type { Filter, UpdateFilter } from 'mongodb';
import { Model, Types } from 'mongoose';

import { AbstractEntity } from './abstract.entity';

// Repository pattern: abstracts database operations from business logic
// Abstract class = must be extended, can't be instantiated directly
// Generic <T> = type-safe operations for any entity extending AbstractEntity
export abstract class AbstractRepository<T extends AbstractEntity> {
  // `protected abstract` = subclasses MUST implement this property
  // Logger scoped to subclass name for easier debugging (e.g., "UsersRepository")
  protected abstract readonly logger: Logger;

  // `protected readonly` = accessible in subclasses, immutable after construction
  constructor(protected readonly model: Model<T>) {}

  async create(document: Omit<T, '_id'>): Promise<T> {
    const createdDocument = new this.model({
      ...document,
      _id: new Types.ObjectId(),
    });
    // .toJSON() strips Mongoose internals, returns plain object
    return (await createdDocument.save()).toJSON() as unknown as T;
  }

  async findOne(filterQuery: Filter<T>): Promise<T> {
    // .lean<T>() = returns plain JS object instead of Mongoose document (faster, no .save())
    const document = await this.model.findOne(filterQuery, {}).lean<T>();

    if (!document) {
      this.logger.warn('Document was not found with filterQuery', filterQuery);
      // NestJS built-in exception - auto-converts to proper HTTP/GraphQL error response
      throw new NotFoundException('Document not found.');
    }

    return document;
  }

  async findOneAndUpdate(
    filterQuery: Filter<T>,
    update: UpdateFilter<T>,
  ): Promise<T> {
    const document = await this.model
      .findOneAndUpdate(filterQuery, update, {
        new: true, // Return updated doc (default returns old doc)
      })
      .lean<T>();

    if (!document) {
      this.logger.warn('Document was not found with filterQuery', filterQuery);
      throw new NotFoundException('Document not found.');
    }

    return document;
  }

  async find(filterQuery: Filter<T>): Promise<T[]> {
    return this.model.find(filterQuery).lean<T[]>();
  }

  async findOneAndDelete(filterQuery: Filter<T>): Promise<T> {
    const document = await this.model.findOneAndDelete(filterQuery).lean<T>();

    if (!document) {
      this.logger.warn('Document was not found with filterQuery', filterQuery);
      throw new NotFoundException('Document not found.');
    }

    return document;
  }
}
