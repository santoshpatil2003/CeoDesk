import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Input, Typography, Sheet, Avatar, Divider, CircularProgress } from '@mui/joy';

// Dummy conversation data (commented out for reference)
/*
const dummyConversations = {
  ...
};
*/
import { addChatMessage, getChatMessages, subscribeToDepartmentChat } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const Chat = ({ department, workspaceId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const { currentUser } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Real-time chat updates
  useEffect(() => {
    if (!workspaceId || !department?.id) return;
    setChatLoading(true);
    const unsubscribe = subscribeToDepartmentChat(
      workspaceId,
      department.id,
      (chatData) => {
        const sortedDates = Object.keys(chatData || {}).sort((a, b) => new Date(a) - new Date(b)); // oldest date first
        let allMessages = [];
        sortedDates.forEach(date => {
          const messagesForDate = chatData[date] || [];
          if (messagesForDate.length > 0) {
            allMessages.push({ id: `date-${date}`, isDateDivider: true, date });
            messagesForDate.forEach((msg, idx) => {
              allMessages.push({ ...msg, id: `${date}-${idx}`, dateKey: date });
            });
          }
        });
        setMessages(allMessages);
        setChatLoading(false);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [workspaceId, department?.id, currentUser]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    const now = new Date();
    // Use local timezone for dateKey
    const dateKey = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const messageObj = {
      message_by: currentUser.name,
      message_by_uid: currentUser.uid.toString(),
      message: newMessage,
      title: currentUser.role || 'Member',
      timestamp: now.toISOString()
    };
    await addChatMessage(workspaceId, department.id, dateKey, messageObj);
    setNewMessage('');
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (chatLoading) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.surface',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          bgcolor: 'transparent',
        }}
      >
        {messages.map((message) => {
          if (message.isDateDivider) {
            const dateObj = new Date(message.date);
            if (!isNaN(dateObj.getTime())) {
              return (
                <Box key={message.id} sx={{ my: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{width: 'auto'}}>
                    <Divider sx={{ flex: 1}} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center'}}>
                    <Typography level="body2" sx={{ mx: 2, color: 'text.tertiary' }}>
                      {dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Typography>
                  </Box>
                  <Box sx={{width: 'auto'}}>
                    <Divider sx={{ flex: 1}} />
                  </Box>
                </Box>
              );
            }
            return null;
          }
          return (
            <Box
              key={message.id}
              sx={{
                mb: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.message_by_uid === currentUser?.uid ? 'flex-end' : 'flex-start',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.message_by_uid === currentUser?.uid ? 'flex-end' : 'flex-start',
                  mb: 0.5,
                  width: '100%',
                }}
              >
                <Typography level="body3" sx={{ color: 'text.tertiary', mb: 0.5, mx: 6 }}>
                  {(message.message_by || message.sender || 'User')}{message.title ? ` · ${message.title}` : ''}
                </Typography>

              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 1,
                  flexDirection: message.message_by_uid === currentUser?.uid ? 'row-reverse' : 'row',
                }}
              >
                <Avatar
                  size="sm"
                  variant="solid"
                  sx={{
                    bgcolor: message.message_by_uid === currentUser?.uid ? 'primary.500' : 'neutral.500',
                  }}
                >
                  {(message.message_by || message.sender || '?').charAt(0)}
                </Avatar>
                <Sheet
                  variant="soft"
                  color={message.message_by_uid === currentUser?.uid ? 'primary' : 'neutral'}
                  sx={{
                    p: 2,
                    borderRadius: 'lg',
                    maxWidth: '70%',
                    position: 'relative',
                    boxShadow: 'sm',
                    bgcolor: 'background.level2',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    // fontWeight: 'bold',
                    overflowWrap: 'break-word',    // break long words
wordBreak: 'break-word',       // break at arbitrary points if needed
   whiteSpace: 'pre-wrap',        // honor newlines and wrap long text
   overflow: 'hidden',            // hide any remaining overflow
   textOverflow: 'ellipsis',
                    color: 'text.primary',
                    fontSize: '1rem',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {message.text || message.message}
                </Sheet>
              </Box>
              <Typography
                level="body3"
                sx={{
                  mt: 0.5,
                  mx: 6,
                  color: 'text.tertiary',
                  alignSelf: message.message_by_uid === currentUser?.uid ? 'flex-end' : 'flex-start',
                }}
              >
                {formatTime(message.timestamp)}
              </Typography>
            </Box>
          )
        })}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <Box
            component="form"
            onSubmit={handleSendMessage}
            sx={{
              p: 2,
              display: 'flex',
              width: '80%',
              gap: 1,
              bgcolor: 'background.surface',
              position: 'relative',
              pt: 4, // Add padding top to make room for the name
            }}
          >
            <Input
              fullWidth
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              size="lg"
              sx={{
                '--Input-focusedThickness': '2px',
                '&:focus-within': {
                  borderColor: 'primary.500',
                },
                bgcolor: 'background.level1',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'text.primary',
              }}
            />
            <Button
              type="submit"
              variant="solid"
              color="primary"
              size="lg"
              sx={{
                px: 3,
                borderRadius: 'md',
                bgcolor: 'primary.500',
                '&:hover': {
                  bgcolor: 'primary.600',
                },
              }}
            >
              Send
            </Button>
          </Box>
      </Box>
    </Box>
  );
};

export default Chat;