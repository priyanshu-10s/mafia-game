import { useEffect, useState } from 'react';
import './RoleReveal.css';

const ROLE_INFO = {
  mafia: {
    name: 'Mafia',
    emoji: '😈',
    color: '#EF4444'
  },
  detective: {
    name: 'Detective',
    emoji: '🔍',
    color: '#3B82F6'
  },
  doctor: {
    name: 'Doctor',
    emoji: '💉',
    color: '#10B981'
  },
  villager: {
    name: 'Villager',
    emoji: '👤',
    color: '#6B7280'
  }
};

function RoleReveal({ game, player, onContinue }) {
  const [countdown, setCountdown] = useState(3);
  const role = player.role;
  const roleInfo = ROLE_INFO[role] || ROLE_INFO.villager;
  
  const isMafia = role === 'mafia';
  const mafiaTeam = isMafia 
    ? Object.values(game.players || {}).filter(p => p.role === 'mafia' && p.uid !== player.uid).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onContinue]);

  return (
    <div className="role-reveal-container">
      <div className="role-reveal-content">
        <h1 className="role-reveal-title">Your Role</h1>
        
        <div className="role-card" style={{ borderColor: roleInfo.color }}>
          <div className="role-emoji">{roleInfo.emoji}</div>
          <h2 className="role-name" style={{ color: roleInfo.color }}>
            {roleInfo.name}
          </h2>
          
          {isMafia && mafiaTeam.length > 0 && (
            <div className="mafia-team-section">
              <p>Your Team:</p>
              <div className="mafia-members">
                {mafiaTeam.map(m => (
                  <span key={m.uid} className="mafia-member" style={{ borderColor: m.color }}>
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="countdown-text">
          Starting in {countdown}...
        </div>

        <p className="remember-text">
          Remember your role! You can check it anytime using "Show Role" button.
        </p>
      </div>
    </div>
  );
}

export default RoleReveal;
