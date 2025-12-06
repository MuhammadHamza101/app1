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

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join document room
  socket.on('join-document', (data) => {
    const { documentId, userId, userName } = data;
    
    socket.join(documentId);
    
    // Track user in document
    if (!documentSessions.has(documentId)) {
      documentSessions.set(documentId, new Set());
    }
    documentSessions.get(documentId).add(userId);
    
    activeUsers.set(socket.id, { userId, userName, documentId });
    
    // Notify others in the document
    socket.to(documentId).emit('user-joined', {
      userId,
      userName,
      activeUsers: Array.from(documentSessions.get(documentId))
    });
    
    // Send current document state to new user
    socket.emit('document-state', {
      activeUsers: Array.from(documentSessions.get(documentId))
    });
    
    console.log(`User ${userName} joined document ${documentId}`);
  });

  // Handle real-time edits
  socket.on('document-edit', (data) => {
    const { documentId, operation, userId, userName } = data;
    
    // Broadcast edit to other users in the document
    socket.to(documentId).emit('document-edit', {
      operation,
      userId,
      userName,
      timestamp: new Date().toISOString()
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
    const { documentId, comment, userId, userName } = data;
    
    // Broadcast comment to all users in document
    io.to(documentId).emit('comment-added', {
      id: Date.now().toString(),
      comment,
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Comment added to document ${documentId} by ${userName}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    
    if (user) {
      const { userId, userName, documentId } = user;
      
      // Remove user from document session
      if (documentSessions.has(documentId)) {
        documentSessions.get(documentId).delete(userId);
        
        // Notify others
        socket.to(documentId).emit('user-left', {
          userId,
          userName,
          activeUsers: Array.from(documentSessions.get(documentId))
        });
        
        // Clean up empty document sessions
        if (documentSessions.get(documentId).size === 0) {
          documentSessions.delete(documentId);
        }
      }
      
      activeUsers.delete(socket.id);
      console.log(`User ${userName} disconnected from document ${documentId}`);
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