import { EventStore, StateEvent, StateSnapshot } from '../types';
import { MongoClient, Collection, Db } from 'mongodb';

export class MongoEventStore implements EventStore {
  private eventsCollection: Collection;
  private snapshotsCollection: Collection;
  private client: MongoClient;
  private db: Db;

  constructor(
    private uri: string,
    private dbName: string
  ) {}

  async connect(): Promise<void> {
    this.client = await MongoClient.connect(this.uri);
    this.db = this.client.db(this.dbName);
    this.eventsCollection = this.db.collection('events');
    this.snapshotsCollection = this.db.collection('snapshots');

    // Create indexes
    await this.eventsCollection.createIndex({ streamId: 1, version: 1 });
    await this.snapshotsCollection.createIndex({ streamId: 1 });
  }

  async append(streamId: string, events: StateEvent[]): Promise<void> {
    // Get the current version
    const lastEvent = await this.eventsCollection
      .find({ streamId })
      .sort({ version: -1 })
      .limit(1)
      .toArray();
    
    const startVersion = lastEvent.length ? lastEvent[0].metadata.version + 1 : 0;

    // Append events with sequential versions
    const eventsToInsert = events.map((event, index) => ({
      streamId,
      type: event.type,
      data: event.data,
      metadata: {
        ...event.metadata,
        version: startVersion + index,
        timestamp: Date.now()
      }
    }));

    await this.eventsCollection.insertMany(eventsToInsert);
  }

  async read(streamId: string, fromVersion = 0): Promise<StateEvent[]> {
    const events = await this.eventsCollection
      .find({
        streamId,
        'metadata.version': { $gte: fromVersion }
      })
      .sort({ 'metadata.version': 1 })
      .toArray();

    return events.map(e => ({
      type: e.type,
      data: e.data,
      metadata: e.metadata
    }));
  }

  async getSnapshot(streamId: string): Promise<StateSnapshot | null> {
    const snapshot = await this.snapshotsCollection.findOne({ streamId });
    return snapshot ? {
      state: snapshot.state,
      version: snapshot.version,
      timestamp: snapshot.timestamp
    } : null;
  }

  async saveSnapshot(streamId: string, snapshot: StateSnapshot): Promise<void> {
    await this.snapshotsCollection.updateOne(
      { streamId },
      {
        $set: {
          state: snapshot.state,
          version: snapshot.version,
          timestamp: snapshot.timestamp
        }
      },
      { upsert: true }
    );
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }
} 