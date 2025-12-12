const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');

// Create HTTP server
const server = http.createServer((req, res) => {
  // Enable CORS
  cors()(req, res, () => {
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end('PatentFlow Collaboration Service Running');
  });
});

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3003;

// Store active users and sessions
const activeUsers = new Map();
const documentSessions = new Map();
const activityFeeds = new Map();
const rolePermissions = {
  admin: ['edit', 'comment', 'annotate', 'highlight', 'assign', 'status-change'],
  attorney: ['edit', 'comment', 'annotate', 'highlight', 'assign', 'status-change'],
  reviewer: ['comment', 'annotate', 'highlight'],
  client: ['comment']
};

const addActivity = (documentId, entry) => {
  if (!activityFeeds.has(documentId)) {
    activityFeeds.set(documentId, []);
  }

  const feed = activityFeeds.get(documentId);
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };

  feed.unshift(record);

  if (feed.length > 100) {
    feed.length = 100;
  }

  return record;
};

const canPerform = (role, action) => {
  const allowed = rolePermissions[role] || [];
  return allowed.includes(action);
};

const sendNotification = ({ recipients, type, message, metadata = {} }) => {
  const payload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    message,
    metadata,
    timestamp: new Date().toISOString()
  };

  recipients.forEach((recipientId) => {
    io.to(recipientId).emit('notification', payload);
  });

  console.log(`Notification dispatched: ${type} -> ${recipients.join(', ')}`);
};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join document room
  socket.on('join-document', (data) => {
    const { documentId, userId, userName, role = 'client' } = data;

    socket.join(documentId);

    // Track user in document
    if (!documentSessions.has(documentId)) {
      documentSessions.set(documentId, new Set());
    }
    documentSessions.get(documentId).add(userId);

    activeUsers.set(socket.id, { userId, userName, documentId, role });

    // Notify others in the document
    socket.to(documentId).emit('user-joined', {
      userId,
      userName,
      role,
      activeUsers: Array.from(documentSessions.get(documentId))
    });

    // Send current document state to new user
    socket.emit('document-state', {
      activeUsers: Array.from(documentSessions.get(documentId)),
      activity: activityFeeds.get(documentId) || []
    });

    console.log(`User ${userName} joined document ${documentId}`);
    addActivity(documentId, {
      type: 'presence',
      description: `${userName} joined the session`,
      userId,
      role
    });
  });

  // Handle real-time edits
  socket.on('document-edit', (data) => {
    const { documentId, operation, userId, userName, role = 'client' } = data;

    if (!canPerform(role, 'edit')) {
      socket.emit('permission-denied', { action: 'edit', role });
      return;
    }

    // Broadcast edit to other users in the document
    socket.to(documentId).emit('document-edit', {
      operation,
      userId,
      userName,
      timestamp: new Date().toISOString()
    });

    addActivity(documentId, {
      type: 'edit',
      description: `${userName} edited the document`,
      userId,
      role
    });

    console.log(`Edit in document ${documentId} by ${userName}`);
  });

  // Handle cursor movements
  socket.on('cursor-move', (data) => {
    const { documentId, position, userId, userName } = data;

    socket.to(documentId).emit('cursor-move', {
      userId,
      userName,
      position,
      timestamp: new Date().toISOString()
    });
  });

  // Handle comments
  socket.on('add-comment', (data) => {
    const { documentId, comment, userId, userName, role = 'client', section = null } = data;

    if (!canPerform(role, 'comment')) {
      socket.emit('permission-denied', { action: 'comment', role });
      return;
    }

    const payload = {
      id: Date.now().toString(),
      comment,
      userId,
      userName,
      role,
      section,
      timestamp: new Date().toISOString()
    };

    // Broadcast comment to all users in document
    io.to(documentId).emit('comment-added', payload);

    addActivity(documentId, {
      type: 'comment',
      description: section
        ? `${userName} commented on section ${section}`
        : `${userName} added a comment`,
      userId,
      role,
      section,
      detail: comment
    });

    console.log(`Comment added to document ${documentId} by ${userName}`);
  });

  socket.on('add-annotation', (data) => {
    const { documentId, annotation, range, userId, userName, role = 'client' } = data;

    if (!canPerform(role, 'annotate')) {
      socket.emit('permission-denied', { action: 'annotate', role });
      return;
    }

    const payload = {
      id: Date.now().toString(),
      annotation,
      range,
      userId,
      userName,
      role,
      timestamp: new Date().toISOString()
    };

    io.to(documentId).emit('annotation-added', payload);

    addActivity(documentId, {
      type: 'annotation',
      description: `${userName} added an annotation`,
      userId,
      role,
      detail: annotation
    });
  });

  socket.on('add-highlight', (data) => {
    const { documentId, highlight, range, userId, userName, role = 'client' } = data;

    if (!canPerform(role, 'highlight')) {
      socket.emit('permission-denied', { action: 'highlight', role });
      return;
    }

    const payload = {
      id: Date.now().toString(),
      highlight,
      range,
      userId,
      userName,
      role,
      timestamp: new Date().toISOString()
    };

    io.to(documentId).emit('highlight-added', payload);

    addActivity(documentId, {
      type: 'highlight',
      description: `${userName} highlighted text`,
      userId,
      role,
      detail: highlight
    });
  });

  socket.on('add-section-comment', (data) => {
    const { documentId, sectionId, comment, userId, userName, role = 'client' } = data;

    if (!canPerform(role, 'comment')) {
      socket.emit('permission-denied', { action: 'comment', role });
      return;
    }

    const payload = {
      id: Date.now().toString(),
      sectionId,
      comment,
      userId,
      userName,
      role,
      timestamp: new Date().toISOString()
    };

    io.to(documentId).emit('section-comment-added', payload);

    addActivity(documentId, {
      type: 'section-comment',
      description: `${userName} commented on section ${sectionId}`,
      userId,
      role,
      section: sectionId,
      detail: comment
    });
  });

  socket.on('presence-update', (data) => {
    const { documentId, userId, userName, status } = data;
    io.to(documentId).emit('presence-update', {
      userId,
      userName,
      status,
      timestamp: new Date().toISOString()
    });

    addActivity(documentId, {
      type: 'presence',
      description: `${userName} is now ${status}`,
      userId,
      status
    });
  });

  socket.on('request-activity-feed', (documentId) => {
    socket.emit('activity-feed', activityFeeds.get(documentId) || []);
  });

  socket.on('assign-user', (data) => {
    const { documentId, assignedUserId, assignedUserName, byUserId, byUserName, role = 'client' } = data;

    if (!canPerform(role, 'assign')) {
      socket.emit('permission-denied', { action: 'assign', role });
      return;
    }

    const activity = addActivity(documentId, {
      type: 'assignment',
      description: `${byUserName} assigned ${assignedUserName} to this patent`,
      userId: byUserId,
      role,
      assignee: assignedUserId
    });

    io.to(documentId).emit('assignment-made', {
      ...activity,
      assignedUserId,
      assignedUserName
    });

    sendNotification({
      recipients: [assignedUserId],
      type: 'assignment',
      message: `${byUserName} assigned you to patent ${documentId}`,
      metadata: { documentId }
    });
  });

  socket.on('status-change', (data) => {
    const { documentId, status, userId, userName, role = 'client' } = data;

    if (!canPerform(role, 'status-change')) {
      socket.emit('permission-denied', { action: 'status-change', role });
      return;
    }

    const activity = addActivity(documentId, {
      type: 'status-change',
      description: `${userName} updated status to ${status}`,
      userId,
      role,
      status
    });

    io.to(documentId).emit('status-changed', activity);

    sendNotification({
      recipients: Array.from(documentSessions.get(documentId) || []),
      type: 'status-change',
      message: `${userName} changed patent ${documentId} status to ${status}`,
      metadata: { documentId, status }
    });
  });

  socket.on('mention', (data) => {
    const { documentId, mentionedUserIds = [], byUserName, context } = data;

    const activity = addActivity(documentId, {
      type: 'mention',
      description: `${byUserName} mentioned ${mentionedUserIds.length} collaborator(s)`,
      userName: byUserName,
      context
    });

    io.to(documentId).emit('mention-created', activity);

    if (mentionedUserIds.length) {
      sendNotification({
        recipients: mentionedUserIds,
        type: 'mention',
        message: `${byUserName} mentioned you in patent ${documentId}`,
        metadata: { documentId, context }
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    
    if (user) {
      const { userId, userName, documentId, role } = user;

      // Remove user from document session
      if (documentSessions.has(documentId)) {
        documentSessions.get(documentId).delete(userId);
        
        // Notify others
        socket.to(documentId).emit('user-left', {
          userId,
          userName,
          role,
          activeUsers: Array.from(documentSessions.get(documentId))
        });

        // Clean up empty document sessions
        if (documentSessions.get(documentId).size === 0) {
          documentSessions.delete(documentId);
        }
      }

      activeUsers.delete(socket.id);
      console.log(`User ${userName} disconnected from document ${documentId}`);
      addActivity(documentId, {
        type: 'presence',
        description: `${userName} left the session`,
        userId,
        role
      });
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🤝 PatentFlow Collaboration Service running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for real-time collaboration`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down collaboration service...');
  server.close(() => {
    console.log('Collaboration service stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down collaboration service...');
  server.close(() => {
    console.log('Collaboration service stopped');
    process.exit(0);
  });
});
