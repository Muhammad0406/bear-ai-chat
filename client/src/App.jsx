import React, { useEffect, useState, useRef } from 'react'

const SUBJECTS = [
  { id: 'math', name: 'Math', icon: '📊', color: '#3B82F6' },
  { id: 'biology', name: 'Biology', icon: '🧬', color: '#10B981' },
  { id: 'physics', name: 'Physics', icon: '⚡️', color: '#8B5CF6' },
  { id: 'chemistry', name: 'Chemistry', icon: '🧪', color: '#F59E0B' }
]

function makeId(){ return Math.random().toString(36).slice(2,9) }

// Welcome Screen Component
function WelcomeScreen({ onStartChat }) {
  const [welcomeInput, setWelcomeInput] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('math')

  function handleWelcomeSubmit(e) {
    e.preventDefault()
    onStartChat(selectedSubject, welcomeInput)
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-container">
        <div className="welcome-header">
          <img src="/bear-logo.svg" alt="BearBrain Logo" className="welcome-logo" />
          <h1 className="welcome-title">BearBrain.ai</h1>
          <p className="welcome-subtitle">Your friendly AI study assistant</p>
        </div>
        
        <div className="welcome-main">
          <h2 className="welcome-question">What are you working on?</h2>
          
          <form onSubmit={handleWelcomeSubmit} className="welcome-form">
            <div className="welcome-subject-selector">
              {SUBJECTS.map(subject => (
                <button
                  key={subject.id}
                  type="button"
                  className={`welcome-subject-btn ${selectedSubject === subject.id ? 'active' : ''}`}
                  onClick={() => setSelectedSubject(subject.id)}
                  style={{'--subject-color': subject.color}}
                >
                  <span className="subject-icon">{subject.icon}</span>
                  <span>{subject.name}</span>
                </button>
              ))}
            </div>
            
            <div className="welcome-input-container">
              <input
                type="text"
                value={welcomeInput}
                onChange={(e) => setWelcomeInput(e.target.value)}
                placeholder="Ask a question or describe what you're studying..."
                className="welcome-input"
              />
              <button type="submit" className="welcome-submit-btn" disabled={!welcomeInput.trim()}>
                Start Learning
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function App(){
  const [activeSubject, setActiveSubject] = useState('math')
  const [chatsBySubject, setChatsBySubject] = useState({}) // {math: [{id, title, messages}], biology: [], physics: [], chemistry: [], ...}
  const [currentChatId, setCurrentChatId] = useState(null)
  const [input, setInput] = useState('')
  const [showWelcome, setShowWelcome] = useState(false)
  const chatRef = useRef(null)

  useEffect(()=>{
    const saved = JSON.parse(localStorage.getItem('bb_chats_by_subject') || 'null')
    const hasUsedApp = localStorage.getItem('bb_has_used_app') === 'true'
    
    if(saved && typeof saved === 'object'){
      const hasAnyChats = Object.values(saved).some(chats => chats && chats.length > 0)
      if(hasAnyChats || hasUsedApp){
        setShowWelcome(false)
        setChatsBySubject(saved)
        // Find first chat in any subject
        const firstSubject = Object.keys(saved).find(s => saved[s]?.length > 0)
        if(firstSubject && saved[firstSubject][0]){
          setActiveSubject(firstSubject)
          setCurrentChatId(saved[firstSubject][0].id)
        } else {
          // Create initial chat if no chats exist but user has used app before
          initializeFirstChat()
        }
      } else {
        // Show welcome for completely new users
        setShowWelcome(true)
      }
    } else {
      // Show welcome for completely new users
      setShowWelcome(true)
    }
  },[])

  function initializeFirstChat(){
    // Mark that user has used the app
    localStorage.setItem('bb_has_used_app', 'true')
    
    const first = { id: makeId(), title: 'New Math Chat', messages: [] }
    setChatsBySubject({ math: [first] })
    setActiveSubject('math')
    setCurrentChatId(first.id)
    setShowWelcome(false)
  }

  useEffect(()=>{
    localStorage.setItem('bb_chats_by_subject', JSON.stringify(chatsBySubject))
  },[chatsBySubject])

  useEffect(()=>{ chatRef.current?.scrollTo(0, chatRef.current.scrollHeight) }, [chatsBySubject, currentChatId])

  function currentChat(){
    const subjectChats = chatsBySubject[activeSubject] || []
    return subjectChats.find(c=>c.id===currentChatId)
  }

  function getCurrentSubject(){
    return SUBJECTS.find(s => s.id === activeSubject) || SUBJECTS[0]
  }

  function addChat(){
    const subjectName = getCurrentSubject().name
    const c = { id: makeId(), title: `New ${subjectName} Chat`, messages: [] }
    setChatsBySubject(prev => ({
      ...prev,
      [activeSubject]: [c, ...(prev[activeSubject] || [])]
    }))
    setCurrentChatId(c.id)
  }

  function deleteChat(id){
    setChatsBySubject(prev => {
      const currentChats = prev[activeSubject] || []
      const next = currentChats.filter(c => c.id !== id)
      
      const updated = { ...prev, [activeSubject]: next }
      
      if(currentChatId === id){
        if(next.length > 0){
          setCurrentChatId(next[0].id)
        } else {
          // Create new chat if none left
          const newChat = { id: makeId(), title: `New ${getCurrentSubject().name} Chat`, messages: [] }
          updated[activeSubject] = [newChat]
          setCurrentChatId(newChat.id)
        }
      }
      
      return updated
    })
  }

  function startNewChatFromWelcome(subjectId, question = ''){
    // Mark that user has used the app
    localStorage.setItem('bb_has_used_app', 'true')
    
    const subject = SUBJECTS.find(s => s.id === subjectId) || SUBJECTS[0]
    const newChat = { id: makeId(), title: `New ${subject.name} Chat`, messages: [] }
    
    setChatsBySubject(prev => ({ ...prev, [subjectId]: [newChat] }))
    setActiveSubject(subjectId)
    setCurrentChatId(newChat.id)
    setShowWelcome(false)
    
    if(question.trim()){
      setInput(question)
      // Auto-send the question after a short delay
      setTimeout(() => {
        if(question.trim()) {
          sendMessage(question.trim(), subjectId, newChat.id)
        }
      }, 100)
    }
  }

  function goBackToWelcome() {
    setShowWelcome(true)
  }

  function switchSubject(subjectId){
    setActiveSubject(subjectId)
    const subjectChats = chatsBySubject[subjectId] || []
    if(subjectChats.length > 0){
      setCurrentChatId(subjectChats[0].id)
    } else {
      // Create first chat for this subject
      const subject = SUBJECTS.find(s => s.id === subjectId)
      const newChat = { id: makeId(), title: `New ${subject.name} Chat`, messages: [] }
      setChatsBySubject(prev => ({ ...prev, [subjectId]: [newChat] }))
      setCurrentChatId(newChat.id)
    }
  }

  async function sendMessage(text, subjectId = activeSubject, chatId = currentChatId){
    const userMsg = { role: 'user', content: text }
    // append to specified chat
    setChatsBySubject(prev => ({
      ...prev,
      [subjectId]: (prev[subjectId] || []).map(c => 
        c.id === chatId ? {...c, messages: [...c.messages, userMsg]} : c
      )
    }))

    const thinking = { role:'bot', content: 'BearBrain is thinking...' }
    setChatsBySubject(prev => ({
      ...prev,
      [subjectId]: (prev[subjectId] || []).map(c => 
        c.id === chatId ? {...c, messages: [...c.messages, thinking]} : c
      )
    }))

    try{
      const currentSubjectData = SUBJECTS.find(s => s.id === subjectId) || SUBJECTS[0]
      const res = await fetch('/api/chat', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ subject: currentSubjectData.name, messages: [userMsg] })
      })
      const data = await res.json()
      setChatsBySubject(prev => ({
        ...prev,
        [subjectId]: (prev[subjectId] || []).map(c => {
          if(c.id !== chatId) return c
          const withoutThinking = c.messages.filter(m => m !== thinking)
          const newMessages = [...withoutThinking, {role:'bot', content: data.reply || data.error || 'No reply'}]
          
          // Update title with first question like ChatGPT (only for the first user message)
          const isFirstQuestion = c.messages.filter(m => m.role === 'user').length === 1
          const newTitle = isFirstQuestion ? text.substring(0, 50) + (text.length > 50 ? '...' : '') : c.title
          
          return {...c, messages: newMessages, title: newTitle}
        })
      }))
    } catch(err){
      setChatsBySubject(prev => ({
        ...prev,
        [subjectId]: (prev[subjectId] || []).map(c => 
          c.id === chatId 
            ? {...c, messages: c.messages.filter(m => m !== thinking).concat({role:'bot', content:'Error contacting server.'})}
            : c
        )
      }))
      console.error(err)
    }
  }

  async function send(){
    const text = input.trim(); if(!text) return
    setInput('')
    await sendMessage(text)
  }

  function handleKey(e){ if(e.key==='Enter'){ e.preventDefault(); send() } }

  const active = currentChat() || { messages: [] }
  const currentSubject = getCurrentSubject()
  const currentSubjectChats = chatsBySubject[activeSubject] || []

  // Show welcome screen for new users
  if(showWelcome){
    return <WelcomeScreen onStartChat={startNewChatFromWelcome} />
  }

  return (
    <div className="app-root" style={{'--subject-color': currentSubject.color}}>
      <header className="topbar">
        <div className="logo">
          <img src="/bear-logo.svg" alt="BearBrain Logo" className="bear-logo" />
          <span className="logo-text">BearBrain.ai</span>
        </div>
        <nav className="subjects">
          {SUBJECTS.map(subject => (
            <button 
              key={subject.id} 
              className={`subject-btn ${subject.id === activeSubject ? 'active' : ''}`}
              onClick={() => switchSubject(subject.id)}
              style={{'--btn-color': subject.color}}
            >
              <span className="subject-icon">{subject.icon}</span>
              <span className="subject-name">{subject.name}</span>
            </button>
          ))}
          <button 
            onClick={goBackToWelcome} 
            className="welcome-btn"
            title="Back to Welcome"
          >
            🏠
          </button>
        </nav>
      </header>

      <main className="main">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h3 className="sidebar-title">{currentSubject.name} Chats</h3>
            <button onClick={addChat} className="new-chat-btn">
              <span>+</span>
            </button>
          </div>
          <div className="chat-list">
            {currentSubjectChats.map(chat => (
              <div 
                key={chat.id} 
                className={`chat-item ${chat.id === currentChatId ? 'active' : ''}`}
                onClick={() => setCurrentChatId(chat.id)}
              >
                <div className="chat-title">{chat.title}</div>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.blur();
                    deleteChat(chat.id);
                  }} 
                  className="delete-chat-btn"
                  title="Delete chat"
                  type="button"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="chat-section">
          <div className="chat-header">
            <h2 className="chat-title">{currentSubject.icon} {currentSubject.name} Tutor</h2>
            <p className="chat-subtitle">Ask questions about {currentSubject.name.toLowerCase()} topics</p>
          </div>
          
          <div className="chat-messages" ref={chatRef}>
            {active.messages.length === 0 && (
              <div className="welcome-message">
                <div className="welcome-icon">{currentSubject.icon}</div>
                <h3>Welcome to {currentSubject.name} with BearBrain!</h3>
                <p>I'm here to help you learn {currentSubject.name.toLowerCase()}. Ask me anything!</p>
              </div>
            )}
            {active.messages.map((message, i) => (
              <div key={i} className={`message ${message.role}`}>
                <div className="message-avatar">
                  {message.role === 'user' ? '👤' : '🐻'}
                </div>
                <div className="message-content">{message.content}</div>
              </div>
            ))}
          </div>

          <div className="input-container">
            <div className="input-wrapper">
              <input 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={handleKey} 
                placeholder={`Ask a ${currentSubject.name} question...`}
                className="chat-input"
              />
              <button onClick={send} className="send-btn" disabled={!input.trim()}>
                <span>Send</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
