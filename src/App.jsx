import React, { useState } from 'react';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [postText, setPostText] = useState('');
  const [chatMessage, setChatMessage] = useState('');

  return (
    <div className="app-container">
      {/* Header / Profile Section */}
      <div className="profile-header">
        <input 
          type="file" 
          id="profileImgInput" 
          accept="image/*" 
          onChange={(e) => console.log('Change profile pic', e)} 
        />
        <div className="profile-info">
          <h3 id="displayUsername">User</h3>
          <small>● Active</small>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button className="logout-btn" onClick={() => alert('Signing out...')}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button 
          className={`tab-btn ${activeTab === 'feed' ? 'active' : ''}`} 
          onClick={() => setActiveTab('feed')}
        >
          Community
        </button>
        <button 
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} 
          onClick={() => setActiveTab('chat')}
        >
          Live Chat
        </button>
        <button 
          className={`tab-btn ${activeTab === 'private' ? 'active' : ''}`} 
          onClick={() => setActiveTab('private')}
        >
          Private Chat
        </button>
        <button 
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} 
          onClick={() => setActiveTab('requests')}
        >
          Requests
        </button>
      </div>

      {/* Community Feed Tab */}
      {activeTab === 'feed' && (
        <div id="feed" className="glass section active">
          <div className="post-input-box">
            <textarea 
              id="postContent" 
              className="glass-input" 
              placeholder="What's on your mind?"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
            />
            <div className="media-buttons">
              <label htmlFor="postImgInput" className="file-btn">Add Photo</label>
            </div>
            <input type="file" id="postImgInput" accept="image/*" style={{ display: 'none' }} />
            
            <button className="action-btn" id="postSubmitBtn" onClick={() => alert('Posting...')}>
              Post
            </button>
          </div>
          <div id="feedList"></div>
        </div>
      )}

      {/* Live Chat Tab */}
      {activeTab === 'chat' && (
        <div id="chat" className="glass section active">
          <div className="chat-messages" id="chatBox"></div>
          <div className="chat-input-box">
            <div className="chat-input-row">
              <input 
                type="text" 
                id="chatInput" 
                className="glass-input" 
                placeholder="Write a message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
              <button className="action-btn" onClick={() => alert('Sending message...')}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
                                }
