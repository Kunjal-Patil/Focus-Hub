import { useState, useEffect, useRef } from 'react';

const useFocusTimer = (websocketUrl) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState("Connecting...");
  const [activeUsers, setActiveUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]); 
  
  const [totalDuration, setTotalDuration] = useState(0);

  const targetTimeRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = new WebSocket(websocketUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket Connected");
      setStatus("Connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "TIMER_STARTED" || data.type === "SYNC_TIMER") {
        targetTimeRef.current = data.end_time;
        
        if (data.duration) {
            setTotalDuration(data.duration * 60);
        }
        
        setIsRunning(true);
      }
      
      if (data.type === "USER_LIST") {
        setActiveUsers(data.users);
      }

      if (data.type === "CHAT") {
        setChatMessages((prev) => [...prev, data]);
      }
    };

    socket.onclose = () => {
      setStatus("Disconnected");
    };

    socket.onerror = (error) => {
      setStatus("Error");
    };

    return () => {
      if (socket.readyState === 1) socket.close();
    };
  }, [websocketUrl]);

  // Timer Logic
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const now = Date.now() / 1000;
      const remaining = targetTimeRef.current - now;
      if (remaining <= 0) {
        setTimeLeft(0);
        setIsRunning(false);
        clearInterval(interval);
      } else {
        setTimeLeft(Math.round(remaining));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Actions
  const startTimer = (minutes) => {
    if (socketRef.current?.readyState === 1) {
      socketRef.current.send(JSON.stringify({ action: "START_TIMER", duration: minutes }));
    }
  };

  const sendFail = () => {
    if (socketRef.current?.readyState === 1) {
      socketRef.current.send(JSON.stringify({ action: "FAIL" }));
    }
  };

  const sendRejoin = () => {
    if (socketRef.current?.readyState === 1) {
      socketRef.current.send(JSON.stringify({ action: "REJOIN" }));
    }
  };

  const sendChat = (message) => {
    if (socketRef.current?.readyState === 1) {
      socketRef.current.send(JSON.stringify({ action: "CHAT", message: message }));
    }
  };

  return { timeLeft, isRunning, startTimer, sendFail, sendRejoin, sendChat, status, activeUsers, chatMessages, totalDuration };
};

export default useFocusTimer;