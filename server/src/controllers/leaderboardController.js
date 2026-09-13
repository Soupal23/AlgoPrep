import mongoose from 'mongoose';
import { Attempt } from '../models/Attempt.js';
import { Test } from '../models/Test.js';

export const getLeaderboard = async (req, res, next) => {
  try {
    const { testId, page = 1, limit = 10 } = req.query;
    const userId = req.user?.userId;

    if (!testId || !mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ error: 'testId query parameter is required to view a test leaderboard' });
    }

    const targetTest = await Test.findById(testId);
    if (!targetTest) {
      return res.status(404).json({ error: 'Test not found' });
    }

    if (targetTest.isAIGenerated) {
      return res.status(400).json({ error: 'AI-generated tests are private self-assessments and do not have leaderboards' });
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const baseFilter = {
      status: 'submitted',
      testId: new mongoose.Types.ObjectId(testId)
    };

    const userObjId = userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;

    // STEP 1: Find the absolute first attempt per candidate for this specific testId
    const distinctPairs = await Attempt.aggregate([
      { $match: baseFilter },
      { $group: { _id: { userId: '$userId', testId: '$testId' } } }
    ]);

    const firstAttemptQueries = distinctPairs.map(pair =>
      Attempt.findOne({
        userId: pair._id.userId,
        testId: pair._id.testId,
        status: 'submitted'
      })
        .sort({ _id: 1 })
        .select('_id')
        .lean()
    );

    const firstAttemptDocs = await Promise.all(firstAttemptQueries);
    const firstAttemptIds = firstAttemptDocs
      .filter(doc => doc !== null)
      .map(doc => doc._id);

    if (firstAttemptIds.length === 0) {
      return res.json({
        test: {
          _id: targetTest._id,
          title: targetTest.title,
          topic: targetTest.topic,
          isAIGenerated: targetTest.isAIGenerated,
          totalQuestions: targetTest.totalQuestions
        },
        leaderboard: [],
        totalParticipants: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
        myStats: null
      });
    }

    // STEP 2: Fetch those exact first-attempts, rank, and paginate
    const pipeline = [
      { $match: { _id: { $in: firstAttemptIds } } },
      {
        $addFields: {
          compositeScore: {
            $subtract: [
              '$score',
              { $divide: [{ $ifNull: ['$timeSpentSeconds', 0] }, 100000000] }
            ]
          }
        }
      },
      {
        $setWindowFields: {
          sortBy: { compositeScore: -1 },
          output: { rank: { $documentNumber: {} } }
        }
      },
      {
        $facet: {
          leaderboard: [
            { $sort: { compositeScore: -1 } },
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
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
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
                { $sort: { compositeScore: -1 } },
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
      test: {
        _id: targetTest._id,
        title: targetTest.title,
        topic: targetTest.topic,
        isAIGenerated: targetTest.isAIGenerated,
        totalQuestions: targetTest.totalQuestions
      },
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
