import { Db } from 'mongodb';

module.exports = {
  async up(db: Db) {
    const chats = db.collection('chats');

    // Set isPrivate: false for all existing chats
    await chats.updateMany(
      { isPrivate: { $exists: false } },
      { $set: { isPrivate: false } },
    );

    // Populate userIds with the creator for all existing chats
    // Uses aggregation pipeline update (MongoDB 4.2+) to reference the document's own userId field
    await chats.updateMany(
      { userIds: { $exists: false } },
      [{ $set: { userIds: ['$userId'] } }],
    );

    // Create multikey index for efficient user-based chat lookups
    await chats.createIndex({ userIds: 1 });
  },
};
