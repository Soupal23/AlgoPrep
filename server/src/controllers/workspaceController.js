import { Workspace } from '../models/Workspace.js';
import { Material } from '../models/Material.js';
import { Chunk } from '../models/Chunk.js';
import { Roadmap } from '../models/Roadmap.js';
import { Day } from '../models/Day.js';
import { Notes } from '../models/Notes.js';
import { DayResource } from '../models/DayResource.js';
import { Job } from '../models/Job.js';
import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { retriever } from '../ai/retriever.js';
import logger from '../utils/logger.js';

export const createWorkspace = async (req, res, next) => {
  try {
    const currentUserId = req.user.userId || req.user._id;
    const { title, subject, description, examDate } = req.body;

    if (!title || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Title and subject are required.'
      });
    }

    const workspace = await Workspace.create({
      ownerId: currentUserId,
      title: title.trim(),
      subject: subject.trim(),
      description: description ? description.trim() : '',
      examDate: examDate ? new Date(examDate) : null
    });

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      workspace
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaces = async (req, res, next) => {
  try {
    const currentUserId = req.user.userId || req.user._id;
    const workspaces = await Workspace.find({ ownerId: currentUserId })
      .sort({ updatedAt: -1 })
      .lean();

    // Attach counts for each workspace
    const workspaceIds = workspaces.map(w => w._id);
    const materials = await Material.find({ workspaceId: { $in: workspaceIds } }).lean();

    const countsByWorkspace = {};
    for (const m of materials) {
      const wid = m.workspaceId.toString();
      if (!countsByWorkspace[wid]) {
        countsByWorkspace[wid] = { materialCount: 0, chunkCount: 0 };
      }
      countsByWorkspace[wid].materialCount += 1;
      countsByWorkspace[wid].chunkCount += m.chunkCount || 0;
    }

    const workspacesWithCounts = workspaces.map(w => ({
      ...w,
      materialCount: countsByWorkspace[w._id.toString()]?.materialCount || 0,
      chunkCount: countsByWorkspace[w._id.toString()]?.chunkCount || 0
    }));

    res.json({
      success: true,
      workspaces: workspacesWithCounts
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceById = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { id } = req.params;
    const workspace = await Workspace.findById(id).lean();

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found.'
      });
    }

    if (workspace.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this workspace.'
      });
    }

    const materials = await Material.find({ workspaceId: id })
      .sort({ createdAt: -1 })
      .lean();

    const chunkCount = await Chunk.countDocuments({ workspaceId: id });

    res.json({
      success: true,
      workspace: {
        ...workspace,
        materials,
        materialCount: materials.length,
        chunkCount
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkspace = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { id } = req.params;
    const { title, subject, description, examDate, status } = req.body;

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found.'
      });
    }

    if (workspace.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to edit this workspace.'
      });
    }

    if (title !== undefined) workspace.title = title.trim();
    if (subject !== undefined) workspace.subject = subject.trim();
    if (description !== undefined) workspace.description = description.trim();
    if (examDate !== undefined) workspace.examDate = examDate ? new Date(examDate) : null;
    if (status !== undefined) workspace.status = status;

    await workspace.save();

    res.json({
      success: true,
      message: 'Workspace updated successfully',
      workspace
    });
  } catch (error) {
    next(error);
  }
};

export const deleteWorkspace = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { id } = req.params;
    const workspace = await Workspace.findById(id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found.'
      });
    }

    if (workspace.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete this workspace.'
      });
    }

    // Cascading cleanup of materials, chunks, roadmaps, days, notes, resources, tests & background jobs
    const roadmaps = await Roadmap.find({ workspaceId: id }).select('_id');
    const roadmapIds = roadmaps.map((r) => r._id);

    const workspaceTests = await Test.find({ workspaceId: id }).select('_id');
    const testIds = workspaceTests.map((t) => t._id);

    await Question.deleteMany({ testId: { $in: testIds } });
    await Attempt.deleteMany({ $or: [{ testId: { $in: testIds } }, { workspaceId: id }] });
    await Test.deleteMany({ workspaceId: id });

    await Day.deleteMany({ roadmapId: { $in: roadmapIds } });
    await Notes.deleteMany({ workspaceId: id });
    await DayResource.deleteMany({ workspaceId: id });
    await Roadmap.deleteMany({ workspaceId: id });
    await Job.deleteMany({ workspaceId: id });
    await Material.deleteMany({ workspaceId: id });
    await Chunk.deleteMany({ workspaceId: id });
    await Workspace.findByIdAndDelete(id);

    logger.info({ workspaceId: id, userId: currentUserId }, 'Workspace and related data deleted');

    res.json({
      success: true,
      message: 'Workspace and its materials deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export const searchWorkspace = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { id } = req.params;
    const { query, k = 6, materialIds } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Query string is required.'
      });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found.'
      });
    }

    if (workspace.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this workspace.'
      });
    }

    const results = await retriever.retrieve({
      workspaceId: id,
      query,
      k: Math.min(Number(k) || 6, 20),
      materialIds
    });

    res.json({
      success: true,
      query,
      count: results.length,
      results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces/:id/tests
 * Retrieves all tests (day tests, mock tests) generated within this workspace.
 */
export const getWorkspaceTests = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { id } = req.params;

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found.'
      });
    }

    if (workspace.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this workspace.'
      });
    }

    const tests = await Test.find({ workspaceId: id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      tests
    });
  } catch (error) {
    next(error);
  }
};
