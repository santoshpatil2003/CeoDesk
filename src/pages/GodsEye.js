import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Input, Button, Sheet, Card, Avatar, Divider, CircularProgress } from '@mui/joy';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../contexts/AuthContext';
import { addGodsEyeChatMessage } from '../firebase/config';
import { db } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';

const GodsEye = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const chatEndRef = useRef(null);
  const { currentWorkspace, currentUser } = useAuth();

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscribe to Godseye chat
  useEffect(() => {
    const chatColRef = collection(
      db,
      'Workspaces',
      currentWorkspace.id,
      'GodsEye',
      currentUser.uid,
      'chat'
    );
    const unsubscribe = onSnapshot(
      chatColRef,
      snapshot => {
        const chatData = {};
        snapshot.docs.forEach(docSnap => {
          chatData[docSnap.id] = docSnap.data().messages || [];
        });
        const sortedDates = Object.keys(chatData).sort();
        const msgs = [];
        sortedDates.forEach(dateKey => {
          chatData[dateKey].forEach(msg => msgs.push(msg));
        });
        setMessages(msgs);
        setChatStarted(msgs.length > 0);
      },
      error => console.error('GodsEye chat subscription error:', error)
    );
    return unsubscribe;
  }, [currentWorkspace, currentUser]);

  // Show loading spinner until workspace and user context are ready
  if (!currentWorkspace?.id || !currentUser?.uid) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size="lg" />
      </Box>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const dateKey = new Date().toISOString().split('T')[0];
    const userMessage = {
      id: Date.now(),
      text: query,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setLoading(true);
    setChatStarted(true);
    setMessages(prev => [...prev, userMessage]);
    try {
      if (currentWorkspace?.id && currentUser?.uid) {
        await addGodsEyeChatMessage(currentWorkspace.id, currentUser.uid, dateKey, userMessage);
      }
      const res = await fetch('http://localhost:5000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage.text }),
      });
      const data = await res.json();
      const aiMessage = {
        id: Date.now() + 1,
        text: data.response || 'I\'m sorry, I couldn\'t process that request.',
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
      if (currentWorkspace?.id && currentUser?.uid) {
        await addGodsEyeChatMessage(currentWorkspace.id, currentUser.uid, dateKey, aiMessage);
      }
    } catch (error) {
      console.error('Error in GodsEye chat:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Error connecting to GodsEye. Please try again later.',
        sender: 'ai',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
      if (currentWorkspace?.id && currentUser?.uid) {
        await addGodsEyeChatMessage(currentWorkspace.id, currentUser.uid, dateKey, errorMessage);
      }
    } finally {
      setLoading(false);
      setQuery('');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        mx: 'auto',
        position: 'relative',
      }}
    >
      {!chatStarted ? (
        // Initial view before chat starts
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          mb: 4
        }}>
          <Typography
            level="h1"
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold',
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              mb: 2,
            }}
          >
            GodsEye AI
          </Typography>
          <Typography
            level="body1"
            sx={{
              color: 'text.secondary',
              fontSize: { xs: '1rem', md: '1.2rem' },
              maxWidth: '600px',
              mx: 'auto',
              mb: 6,
              textAlign: 'center',
            }}
          >
            Your omniscient AI assistant for real-time company insights and analytics.
          </Typography>
        </Box>
      ) : (
        // Chat view after first message
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto', 
          display: 'flex', 
          flexDirection: 'column',
          p: 1,
          pb: 0, // Add extra padding at bottom to account for fixed input box
          height: '100%',
          width: '100%',
          
        }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2,
            width: '100%',
            paddingBottom: 20, // Reduced paddings
          }}>
            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '100%',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                    maxWidth: '80%',
                  }}
                >
                  <Avatar
                    size="sm"
                    variant="solid"
                    sx={{
                      bgcolor: message.sender === 'user' ? 'primary.600' : message.isError ? 'danger.600' : 'neutral.600',
                      mt: 0.5,
                    }}
                  >
                    {message.sender === 'user' ? 'CEO' : 'AI'}
                  </Avatar>
                  <Sheet
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 'lg',
                      maxWidth: '100%',
                      position: 'relative',
                      boxShadow: 'sm',
                      bgcolor: 'transparent',
                      borderColor: message.sender === 'user' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <Box
                      sx={{
                        color: '#ffffff',
                        lineHeight: 1.6,
                        fontSize: '1rem',
                        textAlign: 'left',
                        '& p': { margin: 0 },
                        '& strong': { fontWeight: 'bold' },
                        '& em': { fontStyle: 'italic' },
                        '& code': { fontFamily: 'monospace', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '3px' },
                        '& ul, & ol': { paddingLeft: '20px' },
                        '& a': { color: 'primary.300', textDecoration: 'underline' },
                      }}
                    >
                      <ReactMarkdown>
                        {message.text}
                      </ReactMarkdown>
                    </Box>
                    <Typography
                      level="body3"
                      sx={{
                        mt: 1,
                        color: 'rgba(255, 255, 255, 0.6)',
                        textAlign: 'right',
                      }}
                    >
                      {formatTime(message.timestamp)}
                    </Typography>
                  </Sheet>
                </Box>
              </Box>
            ))}
            {loading && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mt: 2,
                }}
              >
                <Avatar
                  size="sm"
                  variant="solid"
                  sx={{
                    bgcolor: 'neutral.600',
                  }}
                >
                  AI
                </Avatar>
                <CircularProgress size="sm" />
              </Box>
            )}
            <div ref={chatEndRef} />
          </Box>
        </Box>
      )}

      {/* Input area at the bottom */}
      <Card
        variant="outlined"
        sx={{
          p: 2,
          bgcolor: 'transparent',
          borderRadius: 'xl',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          position: 'fixed',
          bottom: 20,
          left: '60%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          width: '60%',
          maxWidth: '1200px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1 }}>
          <Input
            fullWidth
            size="lg"
            placeholder={chatStarted ? "Continue the conversation..." : "Ask about department performance, team analytics, or business insights..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            sx={{
              border: "1px solid rgba(255, 255, 255, 0.2)",
              '--Input-focusedThickness': '2px',
              '&:focus-within': {
                borderColor: 'primary.500',
              },
              bgcolor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 'md',
              color: 'text.primary',
            }}
          />
          <Button
            type="submit"
            size="lg"
            loading={loading}
            disabled={loading || !query.trim()}
            sx={{
              px: 3,
              fontWeight: 600,
              borderRadius: 'xl',
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #00B4E5 90%)',
              },
              '&:disabled': {
                opacity: 0.6,
              },
            }}
          >
            {loading ? 'Thinking...' : 'Send'}
          </Button>
        </Box>
      </Card>
    </Box>
  );
};

export default GodsEye;
