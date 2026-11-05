import jwt from 'jsonwebtoken';
import { getJobById, jobEvents } from '../services/jobService.js';
import { config } from '../config/env.js';
import { verifyAccessToken } from '../utils/jwt.js';

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

export const createStreamTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const job = await getJobById(id, userRole === 'admin' ? null : userId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const ticket = jwt.sign(
      { userId, jobId: job._id.toString(), purpose: 'sse_stream' },
      config.jwtAccessSecret,
      { expiresIn: '60s' }
    );

    res.json({ ticket, expiresIn: 60 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create stream ticket' });
  }
};

export const streamJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let userId = req.user?.userId;
    let userRole = req.user?.role;

    // Authenticate via ticket query parameter or legacy query token if header not present
    if (!userId) {
      const ticket = req.query.ticket;
      const rawToken = req.query.token;

      if (ticket) {
        try {
          const decoded = jwt.verify(ticket, config.jwtAccessSecret);
          if (decoded.purpose === 'sse_stream' && decoded.jobId === id) {
            userId = decoded.userId;
          }
        } catch (ticketErr) {
          res.status(401).json({ error: 'Invalid or expired stream ticket' });
          return;
        }
      } else if (rawToken) {
        try {
          const decoded = verifyAccessToken(rawToken);
          userId = decoded.userId;
          userRole = decoded.role;
        } catch (tokenErr) {
          res.status(401).json({ error: 'Invalid or expired access token' });
          return;
        }
      }
    }

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: Authentication required to stream job' });
      return;
    }

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

    // Heartbeat ping every 15s to keep connections alive through proxies
    const pingInterval = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);

    // Send initial snapshot
    sendEvent({
      jobId: job._id.toString(),
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      result: job.result,
      error: job.error
    });

    // If job is already finished, close stream immediately
    if (job.status === 'completed' || job.status === 'failed') {
      clearInterval(pingInterval);
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
      clearInterval(pingInterval);
      jobEvents.off(eventName, onProgress);
    };

    req.on('close', cleanup);
  } catch (err) {
    res.status(500).end();
  }
};
