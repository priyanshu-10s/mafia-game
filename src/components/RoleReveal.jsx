import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RoleReveal.css';

const ROLE_INFO = {
  mafia: {
    name: 'Mafia',
    emoji: '🔫',
    description: 'You are Mafia! Work with your team to eliminate all villagers.',
    color: '#EF4444'
  },
  detective: {
    name: 'Detective',
    emoji: '🔍',
    description: 'You are the Detective! Investigate players each night to find the Mafia.',
    color: '#3B82F6'
  },
  doctor: {
    name: 'Doctor',
    emoji: '💉',
    description: 'You are the Doctor! Save players each night from elimination.',
    color: '#10B981'
  },
  villager: {
    name: 'Villager',
    emoji: '👤',
    description: 'You are a Villager! Work together to find and eliminate the Mafia.',
    color: '#6B7280'
  }
};

function RoleReveal({ game, player }) {
  const [showRole, setShowRole] = useState(false);
  const navigate = useNavigate();
  const role = player.role;
  const roleInfo = ROLE_INFO[role] || ROLE_INFO.villager;

  const handleContinue = () => {
    navigate('/game');
  };

  return (
    <div className="role-reveal-container">
      <div className="role-reveal-content">
        <h1 className="role-reveal-title">Your Role</h1>
        
        {!showRole ? (
          <div className="role-hidden">
            <div className="role-card-hidden">
              <div className="question-mark">?</div>
              <p>Tap to reveal your role</p>
            </div>
            <button className="btn-reveal" onClick={() => setShowRole(true)}>
              Show Role
            </button>
          </div>
        ) : (
          <div className="role-shown">
            <div 
              className="role-card"
              style={{ borderColor: roleInfo.color }}
            >
              <div className="role-emoji">{roleInfo.emoji}</div>
              <h2 className="role-name" style={{ color: roleInfo.color }}>
                {roleInfo.name}
              </h2>
              <p className="role-description">{roleInfo.description}</p>
            </div>
            
            <button className="btn-hide" onClick={() => setShowRole(false)}>
              Hide Role
            </button>
            
            <button className="btn-continue" onClick={handleContinue}>
              Continue to Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RoleReveal;

