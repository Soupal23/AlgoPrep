import path from 'path';
import { Workspace } from '../models/Workspace.js';
import { Material } from '../models/Material.js';
import { Chunk } from '../models/Chunk.js';
import { createJob } from '../services/jobService.js';
import { getQueues } from '../queue/queues.js';
import { isRedisReady } from '../queue/connection.js';
import { ingestMaterial } from '../services/ingestionService.js';
import { saveUploadedFile, deleteUploadedFile } from '../services/storageService.js';
import logger from '../utils/logger.js';

export const uploadMaterials = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { id: workspaceId } = req.params;
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided for upload.'
      });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found.'
      });
    }

    if (workspace.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to upload to this workspace.'
      });
    }

    const createdMaterials = [];
    const createdJobs = [];

    for (const file of files) {
      // Guess material kind from filename or body
      let kind = req.body.kind || 'notes';
      const nameLower = file.originalname.toLowerCase();
      if (nameLower.includes('syllabus')) kind = 'syllabus';
      else if (nameLower.endsWith('.pptx') || nameLower.includes('slide')) kind = 'slides';
      else if (nameLower.includes('book')) kind = 'book';

      // 1. Save file to disk / cloud storage
      let savedPathOrUrl = '';
      try {
        savedPathOrUrl = await saveUploadedFile({
          buffer: file.buffer,
          originalname: file.originalname,
          subfolder: `workspaces/${workspaceId}`
        });
      } catch (storageErr) {
        logger.error({ err: storageErr.message }, 'Failed to save uploaded file to storage');
      }

      const isCloud = savedPathOrUrl && (savedPathOrUrl.startsWith('http://') || savedPathOrUrl.startsWith('https://'));

      // 2. Create Material record
      const material = await Material.create({
        workspaceId,
        ownerId: currentUserId,
        kind,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        status: 'pending',
        cloudinaryUrl: isCloud ? savedPathOrUrl : ''
      });

      // 3. Create Job record
      const job = await createJob({
        userId: currentUserId,
        type: 'ingest',
        refId: material._id,
        stage: 'Queued for ingestion'
      });

      material.jobId = job._id;
      await material.save();

      createdMaterials.push(material);
      createdJobs.push(job);

      // 4. Dispatch job to BullMQ queue or fallback to direct background execution
      const jobPayload = {
        materialId: material._id.toString(),
        workspaceId: workspaceId.toString(),
        userId: currentUserId,
        filePath: savedPathOrUrl && !isCloud ? path.resolve(savedPathOrUrl) : null,
        fileUrl: isCloud ? savedPathOrUrl : null,
        mimeType: file.mimetype,
        originalName: file.originalname,
        jobId: job._id.toString()
      };

      let queued = false;
      if (isRedisReady()) {
        try {
          const queues = getQueues();
          await queues.ingest.add('ingest-material', jobPayload);
          queued = true;
        } catch (queueErr) {
          logger.warn(
            { err: queueErr.message, materialId: material._id },
            'Failed to enqueue to BullMQ, falling back to direct background execution'
          );
        }
      }

      if (!queued) {
        // Direct async background execution
        ingestMaterial({
          ...jobPayload,
          buffer: file.buffer
        }).catch(err => {
          logger.error({ err: err.message, materialId: material._id }, 'Direct background ingestion failed');
        });
      }
    }

    res.status(202).json({
      success: true,
      message: `${files.length} file(s) uploaded and queued for processing.`,
      materials: createdMaterials,
      jobs: createdJobs
    });
  } catch (error) {
    next(error);
  }
};

export const getMaterials = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { id: workspaceId } = req.params;
    const workspace = await Workspace.findById(workspaceId);

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

    const materials = await Material.find({ workspaceId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      materials
    });
  } catch (error) {
    next(error);
  }
};

export const getMaterialById = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { id: workspaceId, materialId } = req.params;
    const material = await Material.findOne({ _id: materialId, workspaceId });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found.'
      });
    }

    if (material.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this material.'
      });
    }

    res.json({
      success: true,
      material
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMaterial = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { id: workspaceId, materialId } = req.params;
    const material = await Material.findOne({ _id: materialId, workspaceId });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found.'
      });
    }

    if (material.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete this material.'
      });
    }

    // Delete associated chunks
    await Chunk.deleteMany({ materialId });
    await Material.findByIdAndDelete(materialId);

    logger.info({ materialId, workspaceId }, 'Material and its chunks deleted');

    res.json({
      success: true,
      message: 'Material and its chunks deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};
