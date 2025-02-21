import { PersistenceAdapter } from '../types';
import { MongoClient, Collection, Db } from 'mongodb';

export class MongoAdapter<T = unknown> implements PersistenceAdapter<T> {
  private collection: Collection;
  private client: MongoClient;
  private db: Db;

  constructor(
    private uri: string,
    private dbName: string,
    private collectionName: string
  ) {}

  async connect(): Promise<void> {
    this.client = await MongoClient.connect(this.uri);
    this.db = this.client.db(this.dbName);
    this.collection = this.db.collection(this.collectionName);
  }

  async save(key: string, data: T): Promise<void> {
    await this.collection.updateOne(
      { _id: key },
      { $set: { data, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  async load(key: string): Promise<T | null> {
    const doc = await this.collection.findOne({ _id: key });
    return doc ? (doc.data as T) : null;
  }

  async delete(key: string): Promise<void> {
    await this.collection.deleteOne({ _id: key });
  }

  async query(filter: unknown): Promise<T[]> {
    const docs = await this.collection.find(filter).toArray();
    return docs.map(doc => doc.data as T);
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }
} 