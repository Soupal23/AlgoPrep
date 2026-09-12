import { Router } from 'express';
import {
  sendMessage,
  getConversations,
  getConversationMessages,
  getContacts
} from '../controllers/messageController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

router.post('/', sendMessage);
router.get('/contacts', getContacts);
router.get('/conversations', getConversations);
router.get('/conversations/:conversationId', getConversationMessages);

export default router;
