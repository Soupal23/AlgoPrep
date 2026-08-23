import mongoose from 'mongoose';
import { Attempt } from '../models/Attempt.js';

export const getLeaderboard = async (req, res, next) => {
  try {
    const { testId, page = 1, limit = 10 } = req.query;
    const userId = req.user?.userId;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const matchStage = {
      status: { $in: ['submitted', 'expired'] }
    };

    if (testId && mongoose.Types.ObjectId.isValid(testId)) {
      matchStage.testId = new mongoose.Types.ObjectId(testId);
    }

    const userObjId = userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;

    // Aggregation Pipeline
    // 1. $match stage: Uses index on Attempt.score to filter submitted attempts
    // 2. $sort stage: Multi-field sorting by score desc, timeSpentSeconds asc (tie breaker)
    // 3. $setWindowFields stage: Generates rank using $documentNumber over the pre-sorted stream
    const pipeline = [
      { $match: matchStage },
      { $sort: { score: -1, timeSpentSeconds: 1 } },
      {
        $setWindowFields: {
          sortBy: { score: -1, timeSpentSeconds: 1 },
          output: {
            rank: { $documentNumber: {} }
          }
        }
      },
      {
        $facet: {
          leaderboard: [
            { $skip: skip },
            { $limit: limitNum },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
              }
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: 'tests',
                localField: 'testId',
                foreignField: '_id',
                as: 'test'
              }
            },
            { $unwind: { path: '$test', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                rank: 1,
                user: { _id: '$user._id', name: '$user.name', email: '$user.email' },
                test: { _id: '$test._id', title: '$test.title', topic: '$test.topic' },
                score: 1,
                maxScore: 1,
                accuracy: 1,
                timeSpentSeconds: 1,
                submittedAt: 1
              }
            }
          ],
          totalParticipants: [{ $count: 'total' }],
          currentUserRank: userObjId
            ? [
                { $match: { userId: userObjId } },
                { $limit: 1 }
              ]
            : []
        }
      }
    ];

    const [result] = await Attempt.aggregate(pipeline);

    const totalParticipants = result.totalParticipants[0]?.total || 0;
    const leaderboard = result.leaderboard || [];

    let myStats = null;
    if (result.currentUserRank && result.currentUserRank.length > 0) {
      const myAttempt = result.currentUserRank[0];
      const rank = myAttempt.rank;
      // Percentile formula: ((N - R) / (N - 1)) * 100
      const percentile = totalParticipants > 1
        ? Math.max(0, Math.min(100, Math.round(((totalParticipants - rank) / (totalParticipants - 1)) * 1000) / 10))
        : 100;

      myStats = {
        rank,
        percentile,
        score: myAttempt.score,
        maxScore: myAttempt.maxScore,
        accuracy: myAttempt.accuracy,
        timeSpentSeconds: myAttempt.timeSpentSeconds
      };
    }

    res.json({
      leaderboard,
      totalParticipants,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalParticipants / limitNum),
      myStats
    });
  } catch (err) {
    console.error('Leaderboard Aggregation Error:', err);
    next(err);
  }
};
