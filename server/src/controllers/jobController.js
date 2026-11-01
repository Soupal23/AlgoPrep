import { getJobById, jobEvents } from '../services/jobService.js';

export const getJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const job = await getJobById(id, userRole === 'admin' ? null : userId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json({ job });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
};

export const streamJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const job = await getJobById(id, userRole === 'admin' ? null : userId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    // Configure SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial snapshot
    sendEvent({
      jobId: job._id.toString(),
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      result: job.result,
      error: job.error
    });

    // If job is already finished, close stream
    if (job.status === 'completed' || job.status === 'failed') {
      res.end();
      return;
    }

    const eventName = `job:${id}`;
    const onProgress = (update) => {
      sendEvent(update);
      if (update.status === 'completed' || update.status === 'failed') {
        cleanup();
        res.end();
      }
    };

    jobEvents.on(eventName, onProgress);

    const cleanup = () => {
      jobEvents.off(eventName, onProgress);
    };

    req.on('close', cleanup);
  } catch (err) {
    res.status(500).end();
  }
};
