// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (mongoUri) {
  mongoose.connect(mongoUri, {
    ssl: false,
  });
} else {
  console.error('No MongoDB URI provided. Set MONGODB_URI or DATABASE_URL environment variable.');
  process.exit(1);
}