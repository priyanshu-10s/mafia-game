import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
import './GameSettings.css';

function GameSettings({ game }) {
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showProbability, setShowProbability] = useState(false);
  const [settings, setSettings] = useState(game.settings || {
    numMafia: 2,
    hasDetective: true,
    hasDoctor: true,
    dayTimer: 5,
    nightTimer: 1,
    revealOnDeath: false,
    mafiaProbability: {}
  });

  const players = Object.values(game.players || {}).sort((a, b) => a.name.localeCompare(b.name));
  
  const handleSave = async () => {
    try {
      await gameService.updateSettings(user.uid, settings);
      setShowSettings(false);
    } catch (error) {
      alert(error.message || 'Failed to update settings');
    }
  };

  const handleProbabilityChange = (uid, value) => {
    setSettings({
      ...settings,
      mafiaProbability: {
        ...settings.mafiaProbability,
        [uid]: value
      }
    });
  };

  const resetAllProbabilities = () => {
    const probabilities = {};
    players.forEach(p => {
      probabilities[p.uid] = 50;
    });
    setSettings({
      ...settings,
      mafiaProbability: probabilities
    });
  };

  return (
    <>
      <button 
        className="btn-settings"
        onClick={() => setShowSettings(true)}
      >
        ⚙️ Game Settings
      </button>

      {showSettings && !showProbability && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>⚙️ Game Settings</h2>

            <div className="settings-section">
              <h3>Basic</h3>
              
              <div className="setting-item">
                <label>Number of Mafia</label>
                <div className="mafia-buttons">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      className={settings.numMafia === num ? 'active' : ''}
                      onClick={() => setSettings({...settings, numMafia: num})}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-item">
                <label>Special Roles</label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.hasDetective}
                    onChange={(e) => setSettings({...settings, hasDetective: e.target.checked})}
                  />
                  Detective
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.hasDoctor}
                    onChange={(e) => setSettings({...settings, hasDoctor: e.target.checked})}
                  />
                  Doctor
                </label>
              </div>

              <div className="setting-item">
                <label>Phase Timers (minutes)</label>
                <div className="timer-inputs">
                  <div>
                    <label>Day:</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.dayTimer}
                      onChange={(e) => setSettings({...settings, dayTimer: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label>Night:</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={settings.nightTimer}
                      onChange={(e) => setSettings({...settings, nightTimer: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3>Advanced</h3>
              
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.revealOnDeath}
                  onChange={(e) => setSettings({...settings, revealOnDeath: e.target.checked})}
                />
                Reveal role when player dies
              </label>

              <button 
                className="btn-probability"
                onClick={() => setShowProbability(true)}
              >
                🎲 Mafia Probability Per Player →
              </button>
            </div>

            <div className="settings-actions">
              <button className="btn-secondary" onClick={() => setShowSettings(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && showProbability && (
        <div className="modal-overlay" onClick={() => { setShowProbability(false); setShowSettings(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>🎲 Mafia Probability</h2>
            
            <p className="probability-desc">
              Set the chance for each player to become Mafia
            </p>

            <div className="probability-list">
              {players.map(player => {
                const prob = settings.mafiaProbability?.[player.uid] ?? 50;
                return (
                  <div key={player.uid} className="probability-item">
                    <div className="player-info" style={{ borderLeftColor: player.color }}>
                      {player.photoURL && (
                        <img src={player.photoURL} alt={player.name} className="player-avatar" />
                      )}
                      <span className="player-name">{player.name}</span>
                    </div>
                    <div className="slider-container">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={prob}
                        onChange={(e) => handleProbabilityChange(player.uid, parseInt(e.target.value))}
                        style={{ 
                          '--progress': `${prob}%`,
                          '--player-color': player.color 
                        }}
                      />
                      <span className="prob-value">{prob}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="btn-reset" onClick={resetAllProbabilities}>
              Reset All to 50%
            </button>

            <div className="settings-actions">
              <button className="btn-secondary" onClick={() => setShowProbability(false)}>
                ← Back
              </button>
              <button className="btn-primary" onClick={handleSave}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GameSettings;
